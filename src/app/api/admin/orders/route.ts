import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { notifyOrderStatus, notifyPaymentReceived } from "@/lib/notify";
import { releaseCouponForOrder } from "@/lib/couponRules";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import OrderRequest from "@/models/OrderRequest";
import { getAdminSession } from "@/lib/adminAuth";
import { settleAnyOrder, reverseAnyOrder } from "@/lib/commissionBilling";
import { refundAmount } from "@/lib/refundPolicy";
import { releaseOrderStock } from "@/lib/orderFlow";

// the search text is typed by a person: escape it, so "(" or "*" can not break the query
const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function GET(request: NextRequest) {
  try {
    // customer names, phones and emails are here: admins only
    if (!(await getAdminSession("orders"))) {
      return NextResponse.json({ success: false, message: "Admin login required." }, { status: 401 });
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status")?.trim() || "";
    const search = searchParams.get("search")?.trim().slice(0, 100) || "";
    const filter: Record<string, unknown> = {};

    const validStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
    if (validStatuses.includes(status)) { filter.status = status; }

    if (search) {
      const safe = escapeRegex(search);
      filter.$or = [
        { customerName: { $regex: safe, $options: "i" } },
        { customerPhone: { $regex: safe, $options: "i" } },
        { customerEmail: { $regex: safe, $options: "i" } },
        // search by order id too
        { $expr: { $regexMatch: { input: { $toString: "$_id" }, regex: safe, options: "i" } } }
      ];
    }

    const orders = await Order.find(filter).populate("userId", "fullName phone email").sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error("GET admin orders error:", error);
    return NextResponse.json({ success: false, message: "Unable to load orders." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Changing an order can move money and stock, so only admins may do it.
    if (!(await getAdminSession("orders"))) {
      return NextResponse.json({ success: false, message: "Admin login required." }, { status: 401 });
    }
    await connectDB();
    const body = await request.json().catch(() => ({}));
    const { id, status, paymentStatus } = body;

    if (!id || !mongoose.Types.ObjectId.isValid(String(id))) {
      return NextResponse.json({ success: false, message: "Order ID is required." }, { status: 400 });
    }

    const current = await Order.findById(id).select("status paymentMethod paymentStatus userId").lean();
    if (!current) {
      return NextResponse.json({ success: false, message: "Order not found." }, { status: 404 });
    }
    // a cancelled order is closed: its stock and coupon were already given back
    if (current.status === "cancelled") {
      return NextResponse.json({ success: false, message: "A cancelled order can not be changed." }, { status: 409 });
    }

    const validStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
    const validPaymentStatuses = ["pending", "paid", "failed"];
    const updates: Record<string, unknown> = {};

    if (status !== undefined) {
      if (!validStatuses.includes(status)) { return NextResponse.json({ success: false, message: "Invalid order status." }, { status: 400 }); }
      updates.status = status;
      if (status === "cancelled") {
        updates.cancelledAt = new Date();
        updates.cancelledBy = "admin";
        updates.cancelReason = String(body.reason || "Cancelled by the store").trim().slice(0, 200);
      }
      if (status === "delivered") { updates.deliveredAt = new Date(); }
    }
    if (paymentStatus !== undefined) {
      if (!validPaymentStatuses.includes(paymentStatus)) { return NextResponse.json({ success: false, message: "Invalid payment status." }, { status: 400 }); }
      updates.paymentStatus = paymentStatus;
      if (paymentStatus === "paid") { updates.paidAt = new Date(); }
    }

    if (Object.keys(updates).length === 0) { return NextResponse.json({ success: false, message: "No update data provided." }, { status: 400 }); }

    const order = await Order.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true }).populate("userId", "fullName phone email").lean();
    if (!order) { return NextResponse.json({ success: false, message: "Order not found." }, { status: 404 }); }

    // cancelled by the store: give back the stock and the coupon (each only once)
    if (status === "cancelled") {
      await releaseOrderStock(String(id));
      await releaseCouponForOrder(String(id));

      // paid online and no refund request yet: the admin must see it in Returns & refunds
      if (order.paymentMethod !== "cod" && order.paymentStatus === "paid") {
        const exists = await OrderRequest.exists({ orderId: id, type: "refund" });
        if (!exists) {
          await OrderRequest.create({
            orderId: id,
            userId: current.userId,
            type: "refund",
            auto: true,
            reason: "Order cancelled by the store",
            details: String(body.reason || "").slice(0, 600),
            amount: refundAmount(order as never, true),
          });
        }
      }
    }

    // Vendor money: credit when delivered + paid, take back if cancelled later.
    try {
      if (order.status === "delivered") { await settleAnyOrder(String(id)); }
      if (order.status === "cancelled") { await reverseAnyOrder(String(id)); }
    } catch (settleError) {
      console.error("Vendor settlement error:", settleError);
    }

    // tell the customer (bell + /notifications). Never blocks the update.
    try {
      if (status !== undefined) {
        await notifyOrderStatus(order._id, order.userId, order.status);
      }
      if (paymentStatus === "paid") {
        await notifyPaymentReceived(order._id, order.userId);
      }
    } catch (notifyError) {
      console.error("Order notification error:", notifyError);
    }

    return NextResponse.json({ success: true, message: "Order updated successfully.", order });
  } catch (error) {
    console.error("PATCH admin orders error:", error);
    return NextResponse.json({ success: false, message: "Unable to update order." }, { status: 500 });
  }
}
