import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import OrderRequest from "@/models/OrderRequest";
import { CANCEL_STATUSES } from "@/lib/orderRules";
import { refundAmount } from "@/lib/refundPolicy";
import { releaseCouponForOrder } from "@/lib/couponRules";
import { getSessionUserId } from "@/lib/userSession";
import { releaseOrderStock } from "@/lib/orderFlow";

/**
 * The owner gets the full order. Anybody with only the order id (order tracking page)
 * gets a short public version without phone, email, address or account details.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid Order ID." }, { status: 400 });
    }

    const order = await Order.findById(id).lean();
    if (!order) {
      return NextResponse.json({ success: false, message: "Order not found." }, { status: 404 });
    }

    const me = await getSessionUserId();
    if (me && String(order.userId) === me) {
      return NextResponse.json({ success: true, order });
    }

    return NextResponse.json({
      success: true,
      order: {
        _id: order._id,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        createdAt: order.createdAt,
        deliveredAt: order.deliveredAt,
        cancelledAt: order.cancelledAt,
        totalAmount: order.totalAmount,
        currency: order.currency,
        items: order.items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price, image: i.image })),
      },
    });
  } catch (error) {
    console.error("GET /api/orders/[id] error:", error);
    return NextResponse.json({ success: false, message: "Server error." }, { status: 500 });
  }
}

/** The customer cancels their own order (only before it is being prepared / sent). */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const userId = await getSessionUserId();

    if (!mongoose.Types.ObjectId.isValid(id) || !userId) {
      return NextResponse.json({ success: false, message: "Please login again." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    if (body.action !== "cancel") {
      return NextResponse.json({ success: false, message: "Unknown action." }, { status: 400 });
    }
    const reason = String(body.reason || "").trim().slice(0, 200) || "No reason given";

    // only the owner, and only while the status still allows it
    const filter: Record<string, unknown> = { _id: id, userId, status: { $in: CANCEL_STATUSES } };
    const order = await Order.findOneAndUpdate(
      filter,
      { $set: { status: "cancelled", cancelledAt: new Date(), cancelReason: reason, cancelledBy: "customer" } },
      { returnDocument: "after" }
    ).lean();

    if (!order) {
      const mine = await Order.findOne({ _id: id, userId }).select("status").lean();
      if (!mine) return NextResponse.json({ success: false, message: "Order not found." }, { status: 404 });
      return NextResponse.json(
        {
          success: false,
          message:
            mine.status === "cancelled"
              ? "This order is already cancelled."
              : `This order is already ${mine.status} and can no longer be cancelled. After delivery you can use Return / Refund.`,
        },
        { status: 409 }
      );
    }

    // the stock and the coupon use go back to the shop and the customer (each only once)
    await releaseOrderStock(order._id);
    await releaseCouponForOrder(order._id);

    // paid online: a refund of the product price is now owed, the admin sees it in Returns & refunds
    let refund: { amount: number } | null = null;
    if (order.paymentMethod !== "cod" && order.paymentStatus === "paid") {
      const amount = refundAmount(order as never, true);
      await OrderRequest.create({
        orderId: order._id,
        userId,
        type: "refund",
        auto: true,
        reason: "Order cancelled by customer",
        details: reason,
        amount,
      });
      refund = { amount };
    }

    return NextResponse.json({ success: true, message: "Your order has been cancelled.", refund });
  } catch (error) {
    console.error("PATCH /api/orders/[id] error:", error);
    return NextResponse.json({ success: false, message: "Unable to cancel the order." }, { status: 500 });
  }
}
