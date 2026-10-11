import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { getBaseUrl } from "@/lib/sslcommerz";
import { cancelUnpaidOrderByTran } from "@/lib/orderFlow";

/** The customer pressed cancel on the gateway page: the UNPAID order is cancelled, the cart stays. */
export async function POST(request: NextRequest) {
  const baseUrl = getBaseUrl(request);
  try {
    await connectDB();
    const form = await request.formData();
    const tranId = String(form.get("tran_id") || "");
    if (tranId) await cancelUnpaidOrderByTran(tranId, "Payment cancelled by customer");
  } catch (error) {
    console.error("Payment cancel error:", error);
  }
  return NextResponse.redirect(`${baseUrl}/checkout?payment=cancelled`, 303);
}
