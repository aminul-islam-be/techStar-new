import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import OrderRequest from "@/models/OrderRequest";
import { getAdminSession } from "@/lib/adminAuth";
import { reverseAnyOrder } from "@/lib/commissionBilling";

const noAuth = () => NextResponse.json({ success: false, message: "Admin login required." }, { status: 401 });

export async function GET(request: NextRequest) {
  if (!(await getAdminSession())) return noAuth();
  await connectDB();

  const status = new URL(request.url).searchParams.get("status") || "open";
  const filter: Record<string, unknown> =
    status === "open" ? { status: { $in: ["pending", "approved"] } } : status === "all" ? {} : { status };

  const requests = await OrderRequest.find(filter).sort({ createdAt: -1 }).limit(150).lean();
  const orders = await Order.find({ _id: { $in: requests.map((r) => r.orderId) } })
    .select("customerName customerPhone totalAmount currency paymentMethod paymentStatus status items.name items.quantity")
    .lean();
  const omap = new Map(orders.map((o) => [String(o._id), o]));

  return NextResponse.json({
    success: true,
    requests: requests.map((r) => {
      const o = omap.get(String(r.orderId));
      return {
        ...r,
        _id: String(r._id),
        orderId: String(r.orderId),
        order: o
          ? {
              customerName: o.customerName,
              customerPhone: o.customerPhone,
              totalAmount: o.totalAmount,
              currency: o.currency || "BDT",
              paymentMethod: o.paymentMethod,
              paymentStatus: o.paymentStatus,
              status: o.status,
              items: o.items.map((i) => `${i.name} × ${i.quantity}`),
            }
          : null,
      };
    }),
  });
}

/**
 * action:
 *   approve   the return / refund / exchange is accepted
 *   reject    refused (a note for the customer is required)
 *   complete  done: the money was sent back (enter the reference), or the exchange is finished
 * Completing a return or refund also closes the order as cancelled and takes back the
 * vendor's commission / wallet credit.
 */
export async function PATCH(request: NextRequest) {
  if (!(await getAdminSession())) return noAuth();
  await connectDB();

  const { id, action, note, refundRef } = await request.json();
  if (!id || !mongoose.Types.ObjectId.isValid(id) || !["approve", "reject", "complete"].includes(action)) {
    return NextResponse.json({ success: false, message: "Request id and a valid action are required." }, { status: 400 });
  }
  const adminNote = String(note || "").trim().slice(0, 300);
  const ref = String(refundRef || "").trim().slice(0, 100);

  const req = await OrderRequest.findById(id);
  if (!req) return NextResponse.json({ success: false, message: "Request not found." }, { status: 404 });
  if (["completed", "rejected"].includes(req.status)) {
    return NextResponse.json({ success: false, message: "This request is already closed." }, { status: 409 });
  }

  if (action === "reject") {
    if (!adminNote) return NextResponse.json({ success: false, message: "Write a short reason for the customer." }, { status: 400 });
    req.status = "rejected";
    req.adminNote = adminNote;
    req.processedAt = new Date();
    await req.save();
    return NextResponse.json({ success: true });
  }

  if (action === "approve") {
    if (req.status !== "pending") return NextResponse.json({ success: false, message: "Only a new request can be approved." }, { status: 409 });
    req.status = "approved";
    if (adminNote) req.adminNote = adminNote;
    await req.save();
    return NextResponse.json({ success: true });
  }

  // complete
  const order = await Order.findById(req.orderId);
  if (!order) return NextResponse.json({ success: false, message: "Order not found." }, { status: 404 });

  const online = order.paymentMethod !== "cod" && order.paymentStatus === "paid";
  if (req.type !== "exchange" && online && !ref) {
    return NextResponse.json({ success: false, message: "Enter the reference of the refund you sent (bKash, bank or gateway)." }, { status: 400 });
  }

  if (req.type !== "exchange" && !req.auto) {
    // a returned / refunded delivered order is closed as cancelled, and the vendor side is reversed
    if (order.status !== "cancelled") {
      order.status = "cancelled";
      order.cancelledAt = new Date();
      order.cancelledBy = "admin";
      order.cancelReason = `${req.type === "return" ? "Returned" : "Refunded"}: ${req.reason}`;
    }
    order.returnedAt = new Date();
    await order.save();
    try {
      await reverseAnyOrder(String(order._id));
    } catch (error) {
      console.error("Return reversal error:", error);
    }
  }

  req.status = "completed";
  req.refundRef = ref;
  if (adminNote) req.adminNote = adminNote;
  req.processedAt = new Date();
  await req.save();

  return NextResponse.json({ success: true });
}
