import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { getBaseUrl } from "@/lib/sslcommerz";
import { confirmOnlinePayment } from "@/lib/orderFlow";

/**
 * SSLCommerz sends the customer back here after paying. The posted form is NOT trusted:
 * the payment is checked with SSLCommerz before the order is marked paid.
 */
export async function POST(request: NextRequest) {
  const baseUrl = getBaseUrl(request);
  try {
    await connectDB();
    const form = await request.formData();
    const tranId = String(form.get("tran_id") || "");
    const valId = String(form.get("val_id") || "");

    const result = tranId && valId ? await confirmOnlinePayment(tranId, valId) : null;
    return NextResponse.redirect(`${baseUrl}/orders?payment=${result?.ok ? "success" : "pending"}`, 303);
  } catch (error) {
    console.error("Payment success error:", error);
    return NextResponse.redirect(`${baseUrl}/orders?payment=pending`, 303);
  }
}
