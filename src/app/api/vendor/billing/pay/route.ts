import { getSiteSettings } from "@/lib/siteSettings";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import CommissionPayment from "@/models/CommissionPayment";
import { getCurrentVendor, unauthorized } from "@/lib/vendorAuth";
import { createSslSession, getBaseUrl } from "@/lib/sslcommerz";
import { round2 } from "@/lib/commissionMath";

const MIN_ADVANCE = 100;
const MAX_EXTRA = 1_000_000;

/** Starts a payment. The vendor can pay the full due, or more (the extra becomes advance credit). */
export async function POST(request: Request) {
  try {
    const vendor = await getCurrentVendor({ allowLocked: true });
    if (!vendor) return unauthorized();
    await connectDB();

    const body = await request.json();
    const amount = round2(Number(body.amount));
    const due = round2(vendor.dueCommission ?? 0);
    const min = due > 0 ? due : MIN_ADVANCE; // an unpaid due must be paid in full

    if (!Number.isFinite(amount) || amount < min) {
      return NextResponse.json({ success: false, message: `Please pay at least ৳${min}.` }, { status: 400 });
    }
    if (amount > due + MAX_EXTRA) {
      return NextResponse.json({ success: false, message: "This amount is too large." }, { status: 400 });
    }

    const id = new mongoose.Types.ObjectId();
    const tranId = `VC${id.toString()}`; // 26 characters, gateway limit is 30
    await CommissionPayment.create({ _id: id, vendorId: vendor._id, amount, tranId, gateway: "sslcommerz" });

    const session = await createSslSession({
      tranId,
      amount,
      name: vendor.ownerName,
      phone: vendor.phone,
      email: vendor.email,
      address: vendor.address,
      baseUrl: getBaseUrl(request),
      siteName: (await getSiteSettings()).siteName,
    });

    if (!session.ok) {
      await CommissionPayment.updateOne({ _id: id }, { $set: { status: "failed" } });
      return NextResponse.json({ success: false, message: session.message }, { status: 502 });
    }

    return NextResponse.json({ success: true, gatewayUrl: session.gatewayUrl });
  } catch (error) {
    console.error("Vendor billing pay error:", error);
    return NextResponse.json({ success: false, message: "Unable to start the payment." }, { status: 500 });
  }
}
