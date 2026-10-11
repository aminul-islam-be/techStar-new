import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { confirmOnlinePayment, cancelUnpaidOrderByTran } from "@/lib/orderFlow";

/**
 * Server-to-server message from SSLCommerz (IPN). It does not depend on the customer's
 * browser, so a paid order is still recorded if the customer closes the tab.
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const form = await request.formData();
    const tranId = String(form.get("tran_id") || "");
    const valId = String(form.get("val_id") || "");
    const status = String(form.get("status") || "");

    if (status === "FAILED" || status === "CANCELLED") {
      if (tranId) await cancelUnpaidOrderByTran(tranId, `Payment ${status.toLowerCase()} at the gateway`);
    } else if (tranId && valId) {
      await confirmOnlinePayment(tranId, valId);
    }
    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("Payment IPN error:", error);
    return new NextResponse("ERROR", { status: 500 });
  }
}
