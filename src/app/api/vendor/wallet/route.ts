import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Payout from "@/models/Payout";
import VendorTransaction from "@/models/VendorTransaction";
import { getCurrentVendor, unauthorized } from "@/lib/vendorAuth";
import { getSettings } from "@/lib/marketplace";

export async function GET() {
  const vendor = await getCurrentVendor();
  if (!vendor) return unauthorized();
  await connectDB();

  const [transactions, payouts, settings] = await Promise.all([
    VendorTransaction.find({ vendorId: vendor._id }).sort({ createdAt: -1 }).limit(60).lean(),
    Payout.find({ vendorId: vendor._id }).sort({ createdAt: -1 }).limit(30).lean(),
    getSettings(),
  ]);

  return NextResponse.json({
    success: true,
    wallet: {
      balance: vendor.balance,
      pendingPayout: vendor.pendingPayout,
      totalEarned: vendor.totalEarned,
      totalCommission: vendor.totalCommission,
      totalWithdrawn: vendor.totalWithdrawn,
      payoutMethod: vendor.payoutMethod || null,
    },
    minWithdrawal: settings.minWithdrawal,
    transactions,
    payouts,
  });
}
