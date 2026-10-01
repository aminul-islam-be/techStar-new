import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import { getAdminSession } from "@/lib/adminAuth";
import { settleAnyOrder, reverseAnyOrder } from "@/lib/commissionBilling";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status")?.trim() || "";
    const search = searchParams.get("search")?.trim() || "";
    const filter: Record<string, unknown> = {};

    const validStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
    if (validStatuses.includes(status)) { filter.status = status; }

    if (search) {
      filter.$or = [
        { customerName: { $regex: search, $options: "i" } },
        { customerPhone: { $regex: search, $options: "i" } },
        { customerEmail: { $regex: search, $options: "i" } },
        // এই নতুন লাইনটি অর্ডার আইডি দিয়ে সার্চ করার ম্যাজিক করবে!
        { $expr: { $regexMatch: { input: { $toString: "$_id" }, regex: search, options: "i" } } }
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
    // Changing an order can move vendor money, so only admins may do it.
    if (!(await getAdminSession())) {
      return NextResponse.json({ success: false, message: "Admin login required." }, { status: 401 });
    }
    await connectDB();
    const body = await request.json();
    const { id, status, paymentStatus } = body;

    if (!id) { return NextResponse.json({ success: false, message: "Order ID is required." }, { status: 400 }); }

    const validStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
    const validPaymentStatuses = ["pending", "paid", "failed"];
    const updates: Record<string, unknown> = {};

    if (status !== undefined) {
      if (!validStatuses.includes(status)) { return NextResponse.json({ success: false, message: "Invalid order status." }, { status: 400 }); }
      updates.status = status;
      if (status === "cancelled") { updates.cancelledAt = new Date(); }
      if (status === "delivered") { updates.deliveredAt = new Date(); }
    }
    if (paymentStatus !== undefined) {
      if (!validPaymentStatuses.includes(paymentStatus)) { return NextResponse.json({ success: false, message: "Invalid payment status." }, { status: 400 }); }
      updates.paymentStatus = paymentStatus;
    }

    if (Object.keys(updates).length === 0) { return NextResponse.json({ success: false, message: "No update data provided." }, { status: 400 }); }

    const order = await Order.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true }).populate("userId", "fullName phone email").lean();

    if (!order) { return NextResponse.json({ success: false, message: "Order not found." }, { status: 404 }); }

    // Vendor payouts: credit when delivered + paid, take back if cancelled later.
    try {
      if (order.status === "delivered") { await settleAnyOrder(String(id)); }
      if (order.status === "cancelled") { await reverseAnyOrder(String(id)); }
    } catch (settleError) {
      console.error("Vendor settlement error:", settleError);
    }

    return NextResponse.json({ success: true, message: "Order updated successfully.", order });
  } catch (error) {
    console.error("PATCH admin orders error:", error);
    return NextResponse.json({ success: false, message: "Unable to update order." }, { status: 500 });
  }
}
