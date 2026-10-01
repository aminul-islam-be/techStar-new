import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { finalizeGatewayPayment } from "@/lib/commissionBilling";

/**
 * Server-to-server notice from SSLCommerz (the "webhook"). It still asks the
 * gateway to confirm the payment, so a fake call cannot unlock a vendor.
 */
export async function POST(request: Request) {
  try {
    await connectDB();
    const form = await request.formData().catch(() => null);
    const tranId = String(form?.get("tran_id") || "");
    const valId = String(form?.get("val_id") || "");
    const status = String(form?.get("status") || "");

    if (tranId && valId && (status === "VALID" || status === "VALIDATED")) {
      await finalizeGatewayPayment(tranId, valId);
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Billing IPN error:", error);
    return NextResponse.json({ received: false }, { status: 500 }); // the gateway will retry
  }
}
