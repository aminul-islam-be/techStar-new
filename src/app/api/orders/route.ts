import { NextRequest, NextResponse } from "next/server";
import { notifyOrderPlaced } from "@/lib/notify";
import { redeemCoupon, releaseCouponCount, recordCouponUsage } from "@/lib/couponRules";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import { buildPricedOrder } from "@/lib/orderPricing";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Header থেকে ইউজার আইডি বের করা
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json({ success: false, message: "Please login to view your orders." }, { status: 401 });
    }

    // ইউজারের সব অর্ডার ডাটাবেজ থেকে খুঁজে বের করা (নতুন অর্ডার আগে দেখানোর জন্য createdAt: -1)
    const orders = await Order.find({ userId }).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error("GET orders error:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const userId = request.headers.get("x-user-id");
    const body = await request.json();

    const orderUserId = userId || body.userId;

    if (!orderUserId) {
      return NextResponse.json({ success: false, message: "Unauthorized", redirectToLogin: true }, { status: 401 });
    }

    // The server prices the order: product totals, courier charge for every
    // parcel (80 / 120 by default) and the vendor commission snapshot.
    const priced = await buildPricedOrder(Array.isArray(body.items) ? body.items : [], body.deliveryAddress);

    if (!priced.items.length) {
      return NextResponse.json({ success: false, message: "Your cart has no valid items." }, { status: 400 });
    }

    // ----- coupon: checked again here, the browser's discount is never trusted -----
    const couponInput = String(body.couponCode || "").trim();
    let appliedCoupon: { id: string; code: string; discount: number } | null = null;

    if (couponInput) {
      const redeemed = await redeemCoupon(couponInput, String(orderUserId), priced.itemsTotal);

      if (redeemed.ok === false) {
        return NextResponse.json(
          { success: false, message: redeemed.message, couponError: true },
          { status: 400 }
        );
      }

      appliedCoupon = { id: redeemed.couponId, code: redeemed.code, discount: redeemed.discount };
    }

    const finalTotal = Math.max(
      0,
      Math.round((priced.totalAmount - (appliedCoupon ? appliedCoupon.discount : 0)) * 100) / 100
    );

    let newOrder;
    try {
      newOrder = await Order.create({
      userId: orderUserId,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      customerEmail: body.customerEmail,
      items: priced.items,
      totalAmount: finalTotal,
      couponCode: appliedCoupon ? appliedCoupon.code : undefined,
      discountAmount: appliedCoupon ? appliedCoupon.discount : 0,
      itemsTotal: priced.itemsTotal,
      courierTotal: priced.courierTotal,
      shippingZone: priced.zone,
      currency: body.currency,
      paymentMethod: body.paymentMethod === "cod" ? "cod" : "sslcommerz",
      deliveryAddress: body.deliveryAddress,
      // Must match the lowercase values allowed by the Order schema.
      status: "pending",
      paymentStatus: "pending",
    });
    } catch (createError) {
      // the order did not save: give the coupon use back
      if (appliedCoupon) await releaseCouponCount(appliedCoupon.id);
      throw createError;
    }

    if (appliedCoupon) {
      await recordCouponUsage({
        couponId: appliedCoupon.id,
        code: appliedCoupon.code,
        userId: String(orderUserId),
        orderId: newOrder._id,
        discount: appliedCoupon.discount,
      });
    }

    await notifyOrderPlaced(newOrder._id, orderUserId);

    return NextResponse.json({
      success: true,
      message: "Order placed successfully",
      orderId: newOrder._id,
    });
  } catch (error) {
    console.error("POST orders error:", error);
    return NextResponse.json({ success: false, message: "Failed to place order" }, { status: 500 });
  }
}
