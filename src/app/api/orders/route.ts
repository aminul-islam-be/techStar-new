import { NextRequest, NextResponse } from "next/server";
import { notifyOrderPlaced } from "@/lib/notify";
import { redeemCoupon, releaseCouponCount, recordCouponUsage } from "@/lib/couponRules";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import { buildPricedOrder } from "@/lib/orderPricing";
import { getSessionUserId } from "@/lib/userSession";
import { reserveStock, giveBackStock, releaseStaleOnlineOrders, removeOrderItemsFromCart } from "@/lib/orderFlow";
import { estimateDelivery } from "@/lib/shipments";

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export async function GET() {
  try {
    await connectDB();
    // the logged-in customer, from the signed cookie (never from a header)
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ success: false, message: "Please login to view your orders." }, { status: 401 });
    }
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
    const userId = await getSessionUserId();
    const body = await request.json().catch(() => ({}));

    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized", redirectToLogin: true }, { status: 401 });
    }

    const address = body.deliveryAddress || {};
    const customerName = String(body.customerName || "").trim();
    const customerPhone = String(body.customerPhone || "").trim();
    const addressLine = String(address.address || "").trim();
    const city = String(address.city || "").trim();

    if (!customerName || !customerPhone || !addressLine || !city) {
      return NextResponse.json({ success: false, message: "Name, phone, address and city are required." }, { status: 400 });
    }

    const paymentMethod = body.paymentMethod === "cod" ? "cod" : "sslcommerz";

    // 1) prices and stock checked on the server (the browser's prices are ignored)
    const priced = await buildPricedOrder(Array.isArray(body.items) ? body.items : [], { city });
    if (priced.ok === false) {
      return NextResponse.json({ success: false, message: priced.message }, { status: 400 });
    }

    // 2) coupon: checked AND counted here, the browser's discount is never trusted
    const couponInput = String(body.couponCode || "").trim();
    let applied: { id: string; code: string; discount: number } | null = null;
    if (couponInput) {
      const redeemed = await redeemCoupon(couponInput, userId, priced.itemsTotal);
      if (redeemed.ok === false) {
        return NextResponse.json({ success: false, message: redeemed.message, couponError: true }, { status: 400 });
      }
      applied = { id: redeemed.couponId, code: redeemed.code, discount: redeemed.discount };
    }

    // 3) unpaid online orders of this customer (and very old ones) give their stock back first
    await releaseStaleOnlineOrders(userId);

    // 4) stock: every line or nothing
    const stockLines = priced.items.map((i) => ({ productId: i.productId, quantity: i.quantity }));
    const reserved = await reserveStock(stockLines);
    if (!reserved) {
      if (applied) await releaseCouponCount(applied.id);
      return NextResponse.json(
        { success: false, message: "Some items just sold out. Please review your cart." },
        { status: 409 }
      );
    }

    // 5) save the order
    let newOrder;
    try {
      newOrder = await Order.create({
        userId,
        customerName,
        customerPhone,
        customerEmail: String(body.customerEmail || "").trim() || undefined,
        items: priced.items,
        totalAmount: Math.max(0, round2(priced.totalAmount - (applied ? applied.discount : 0))),
        couponCode: applied ? applied.code : undefined,
        discountAmount: applied ? applied.discount : 0,
        itemsTotal: priced.itemsTotal,
        courierTotal: priced.courierTotal,
        shippingZone: priced.zone,
        // always BDT: the gateway charges BDT, whatever currency the browser shows
        currency: "BDT",
        paymentMethod,
        deliveryAddress: {
          fullName: String(address.fullName || customerName).trim(),
          phone: String(address.phone || customerPhone).trim(),
          address: addressLine,
          city,
          area: String(address.area || "").trim(),
        },
        deliveryInstructions: String(body.deliveryInstructions || "").trim().slice(0, 300) || undefined,
        estimatedDeliveryDate: estimateDelivery(priced.zone),
        status: "pending",
        paymentStatus: "pending",
        stockReserved: true,
      });
    } catch (createError) {
      await giveBackStock(stockLines);
      if (applied) await releaseCouponCount(applied.id);
      throw createError;
    }

    if (applied) {
      await recordCouponUsage({
        couponId: applied.id,
        code: applied.code,
        userId,
        orderId: newOrder._id,
        discount: applied.discount,
      });
    }

    // Cash on delivery is final now, so the bought items leave the cart.
    // Online payment removes them only after the payment is confirmed.
    if (paymentMethod === "cod") {
      await removeOrderItemsFromCart(userId, priced.items);
    }

    await notifyOrderPlaced(newOrder._id, userId);

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
