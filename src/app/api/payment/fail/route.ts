import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { getBaseUrl } from "@/lib/sslcommerz";
import { cancelUnpaidOrderByTran } from "@/lib/orderFlow";

/** The gateway reports a failed payment: the UNPAID order is cancelled and its stock is given back. */
export async function POST(request: NextRequest) {
  const baseUrl = getBaseUrl(request);
  try {
    await connectDB();
    const form = await request.formData();
    const tranId = String(form.get("tran_id") || "");
    if (tranId) await cancelUnpaidOrderByTran(tranId, "Payment failed");
  } catch (error) {
    console.error("Payment fail error:", error);
  }
  // the cart is still saved, so the customer can try again right away
  return NextResponse.redirect(`${baseUrl}/checkout?payment=failed`, 303);
}
