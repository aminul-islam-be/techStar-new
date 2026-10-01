import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import CommissionLedger from "@/models/CommissionLedger";
import CommissionPayment from "@/models/CommissionPayment";
import { getCurrentVendor, unauthorized } from "@/lib/vendorAuth";
import { getSettings } from "@/lib/marketplace";
import { nextLockDateLabel } from "@/lib/commissionMath";

/** Works even while the shop is locked (the vendor must be able to see and pay the due). */
export async function GET() {
  const vendor = await getCurrentVendor({ allowLocked: true });
  if (!vendor) return unauthorized();
  await connectDB();

  const [settings, ledger, payments] = await Promise.all([
    getSettings(),
    CommissionLedger.find({ vendorId: vendor._id }).sort({ createdAt: -1 }).limit(60).lean(),
    CommissionPayment.find({ vendorId: vendor._id }).sort({ createdAt: -1 }).limit(20).lean(),
  ]);

  return NextResponse.json({
    success: true,
    billing: {
      due: vendor.dueCommission ?? 0,
      credit: vendor.creditBalance ?? 0,
      locked: Boolean(vendor.billingLocked),
      graceDays: settings.commissionGraceDays ?? 0,
      nextLockDate: nextLockDateLabel(settings.commissionGraceDays ?? 0),
    },
    ledger,
    payments,
  });
}
