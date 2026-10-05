import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import OrderRequest from "@/models/OrderRequest";
import { RETURN_WINDOW_DAYS, returnWindow } from "@/lib/orderRules";
import { refundAmount } from "@/lib/refundPolicy";

const TYPES = ["return", "refund", "exchange"];

/** The customer asks for a return, a refund or an exchange after delivery. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const userId = request.headers.get("x-user-id")?.trim() || "";

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ success: false, message: "Please login again." }, { status: 401 });
    }

    const body = await request.json();
    const type = String(body.type || "");
    const reason = String(body.reason || "").trim().slice(0, 200);
    const details = String(body.details || "").trim().slice(0, 600);

    if (!TYPES.includes(type)) return NextResponse.json({ success: false, message: "Choose what you need." }, { status: 400 });
    if (!reason) return NextResponse.json({ success: false, message: "Please choose a reason." }, { status: 400 });

    const order = await Order.findOne({ _id: id, userId }).lean();
    if (!order) return NextResponse.json({ success: false, message: "Order not found." }, { status: 404 });

    if (order.status !== "delivered") {
      return NextResponse.json({ success: false, message: "You can ask for a return, refund or exchange after the order is delivered." }, { status: 400 });
    }
    if (!returnWindow(order).open) {
      return NextResponse.json({ success: false, message: `The ${RETURN_WINDOW_DAYS}-day return period for this order is over.` }, { status: 400 });
    }

    const open = await OrderRequest.exists({ orderId: id, auto: { $ne: true }, status: { $in: ["pending", "approved"] } });
    if (open) {
      return NextResponse.json({ success: false, message: "You already have an open request for this order." }, { status: 409 });
    }

    const created = await OrderRequest.create({
      orderId: id,
      userId,
      type: type as "return" | "refund" | "exchange",
      reason,
      details,
      amount: type === "exchange" ? 0 : refundAmount(order as never, false),
    });

    return NextResponse.json({ success: true, message: "Request sent. We will review it and reply soon.", request: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/orders/[id]/requests error:", error);
    return NextResponse.json({ success: false, message: "Unable to send the request." }, { status: 500 });
  }
}
