import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import OrderRequest from "@/models/OrderRequest";
import { CANCEL_STATUSES } from "@/lib/orderRules";
import { refundAmount } from "@/lib/refundPolicy";
import { releaseCouponForOrder } from "@/lib/couponRules";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error("GET /api/orders/[id] error:", error);
    return NextResponse.json({ success: false, message: "Server error." }, { status: 500 });
  }
}

/** The customer cancels their own order (only before it is being prepared / sent). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const userId = request.headers.get("x-user-id")?.trim() || "";

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(userId)) {
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

    // the customer may use the coupon again
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
