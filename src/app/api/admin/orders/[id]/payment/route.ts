import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getAdminSession } from "@/lib/adminAuth";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import OrderRequest from "@/models/OrderRequest";
import { refundAmount } from "@/lib/refundPolicy";
import { settleOrder } from "@/lib/marketplace";
import { notifyPaymentReceived } from "@/lib/notify";

function fail(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

/**
 * Admin checks a send-money payment in the bKash / Nagad / Rocket statement,
 * then verifies it (the order becomes paid) or rejects it.
 * Body: { action: "verify" | "reject", note?: string }
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession("orders"))) {
    return NextResponse.json({ success: false, message: "Admin login required." }, { status: 401 });
  }
  try {
    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return fail("Invalid order ID.");

    const body = await request.json().catch(() => ({}));
    const note = String(body.note || "").trim().slice(0, 200);
    const order = await Order.findById(id).select("paymentMethod manualPayment").lean();
    if (!order) return fail("Order not found.", 404);
    if (order.paymentMethod !== "manual" || !order.manualPayment) {
      return fail("This order was not paid by send money.");
    }

    if (body.action === "verify") {
      const now = new Date();
      // only one request can verify the payment (a double click is safe)
      const claimed = await Order.findOneAndUpdate(
        { _id: id, paymentStatus: { $ne: "paid" } },
        {
          $set: {
            paymentStatus: "paid",
            paidAt: now,
            "manualPayment.status": "verified",
            "manualPayment.verifiedAt": now,
            "manualPayment.adminNote": note,
          },
        },
        { returnDocument: "after" }
      ).lean();
      if (!claimed) return fail("This payment is already verified.", 409);

      // paid after the order was cancelled: the money must go back, the admin sees it in Returns & refunds
      if (claimed.status === "cancelled") {
        const exists = await OrderRequest.exists({ orderId: id, type: "refund" });
        if (!exists) {
          await OrderRequest.create({
            orderId: id,
            userId: claimed.userId,
            type: "refund",
            auto: true,
            reason: "Send money received after the order was cancelled",
            details: `TrxID ${claimed.manualPayment?.trxId || ""}`,
            amount: refundAmount(claimed as never, true),
          });
        }
        return NextResponse.json({ success: true, message: "Payment verified. The order is cancelled, so a refund is requested." });
      }

      try {
        await settleOrder(String(id));
      } catch (error) {
        console.error("Settlement error:", error);
      }
      try {
        await notifyPaymentReceived(claimed._id, claimed.userId);
      } catch (error) {
        console.error("Payment notification error:", error);
      }
      return NextResponse.json({ success: true, message: "Payment verified. The order is now paid." });
    }

    if (body.action === "reject") {
      const rejected = await Order.findOneAndUpdate(
        { _id: id, paymentStatus: { $ne: "paid" } },
        { $set: { paymentStatus: "failed", "manualPayment.status": "rejected", "manualPayment.adminNote": note } },
        { returnDocument: "after" }
      ).lean();
      if (!rejected) return fail("A verified payment can not be rejected.", 409);
      return NextResponse.json({ success: true, message: "Payment rejected. The customer can cancel the order and place it again." });
    }

    return fail("Unknown action.");
  } catch (error) {
    console.error("PATCH admin order payment error:", error);
    return NextResponse.json({ success: false, message: "Unable to update the payment." }, { status: 500 });
  }
}
