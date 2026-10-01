import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import CommissionPayment from "@/models/CommissionPayment";
import { finalizeGatewayPayment } from "@/lib/commissionBilling";
import { getBaseUrl } from "@/lib/sslcommerz";

type Ctx = { params: Promise<{ result: string }> };

/** The vendor's browser comes back here from the payment page (SSLCommerz sends a POST). */
export async function POST(request: Request, { params }: Ctx) {
  const { result } = await params;
  const base = getBaseUrl(request);
  let outcome = result === "cancel" ? "cancelled" : "failed";

  try {
    await connectDB();
    const form = await request.formData().catch(() => null);
    const tranId = String(form?.get("tran_id") || "");
    const valId = String(form?.get("val_id") || "");

    if (tranId) {
      if (result === "success" && valId) {
        const r = await finalizeGatewayPayment(tranId, valId);
        outcome = r.ok ? "success" : "failed";
      } else {
        await CommissionPayment.updateOne(
          { tranId, status: "pending" },
          { $set: { status: result === "cancel" ? "cancelled" : "failed" } }
        );
      }
    }
  } catch (error) {
    console.error("Billing callback error:", error);
    outcome = "failed";
  }

  return NextResponse.redirect(`${base}/vendor/billing?payment=${outcome}`, 303);
}

// opening the link directly just goes back to the billing page
export async function GET(request: Request) {
  return NextResponse.redirect(`${getBaseUrl(request)}/vendor/billing`, 303);
}
