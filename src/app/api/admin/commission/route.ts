import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Vendor from "@/models/Vendor";
import CommissionLedger from "@/models/CommissionLedger";
import MarketplaceSettings from "@/models/MarketplaceSettings";
import { getAdminSession } from "@/lib/adminAuth";
import { getSettings } from "@/lib/marketplace";
import { recordManualPayment, runCommissionLock } from "@/lib/commissionBilling";
import { dhakaDate, round2 } from "@/lib/commissionMath";

const noAuth = () => NextResponse.json({ success: false, message: "Admin login required." }, { status: 401 });

export async function GET(request: NextRequest) {
  if (!(await getAdminSession())) return noAuth();
  await connectDB();

  const filter = new URL(request.url).searchParams.get("filter") || "owing";
  const query: Record<string, unknown> =
    filter === "locked"
      ? { billingLocked: true }
      : filter === "all"
      ? { $or: [{ dueCommission: { $gt: 0 } }, { creditBalance: { $gt: 0 } }, { billingLocked: true }] }
      : { dueCommission: { $gt: 0 } };

  const [vendors, settings, totals] = await Promise.all([
    Vendor.find(query).select("shopName ownerName phone status dueCommission creditBalance billingLocked billingLockedAt").sort({ dueCommission: -1 }).limit(200).lean(),
    getSettings(),
    Vendor.aggregate([
      {
        $group: {
          _id: null,
          totalDue: { $sum: "$dueCommission" },
          totalCredit: { $sum: "$creditBalance" },
          locked: { $sum: { $cond: [{ $eq: ["$billingLocked", true] }, 1, 0] } },
          owing: { $sum: { $cond: [{ $gt: ["$dueCommission", 0] }, 1, 0] } },
        },
      },
    ]),
  ]);

  const t = totals[0] || { totalDue: 0, totalCredit: 0, locked: 0, owing: 0 };

  return NextResponse.json({
    success: true,
    vendors,
    summary: { totalDue: round2(t.totalDue), totalCredit: round2(t.totalCredit), locked: t.locked, owing: t.owing },
    settings: {
      commissionGraceDays: settings.commissionGraceDays ?? 0,
      lastLockRunMonth: settings.lastLockRunMonth || "",
      lastLockRunAt: settings.lastLockRunAt || null,
      currentMonth: dhakaDate().month,
    },
  });
}

/**
 * action:
 *   record   { vendorId, amount, ref }  you received money outside the gateway
 *   unlock   { vendorId }               open the shop without payment (waive)
 *   runLock  {}                         lock every vendor who owes, right now
 *   setGrace { days }                   0-10 days after the 1st before locking
 */
export async function POST(request: NextRequest) {
  if (!(await getAdminSession())) return noAuth();
  await connectDB();

  const body = await request.json();
  const action = String(body.action || "");

  try {
    if (action === "record") {
      const amount = round2(Number(body.amount));
      const ref = String(body.ref || "").trim();
      if (!mongoose.Types.ObjectId.isValid(body.vendorId) || !Number.isFinite(amount) || amount <= 0 || !ref) {
        return NextResponse.json({ success: false, message: "Vendor, amount and a transaction reference are required." }, { status: 400 });
      }
      const r = await recordManualPayment(body.vendorId, amount, ref);
      return NextResponse.json({ success: true, ...r });
    }

    if (action === "unlock") {
      if (!mongoose.Types.ObjectId.isValid(body.vendorId)) {
        return NextResponse.json({ success: false, message: "Vendor id is required." }, { status: 400 });
      }
      const v = await Vendor.findByIdAndUpdate(
        body.vendorId,
        { $set: { billingLocked: false }, $unset: { billingLockedAt: "" } },
        { returnDocument: "after" }
      );
      if (!v) return NextResponse.json({ success: false, message: "Vendor not found." }, { status: 404 });
      await CommissionLedger.create({
        vendorId: v._id,
        type: "waiver",
        amount: 0,
        dueAfter: v.dueCommission ?? 0,
        creditAfter: v.creditBalance ?? 0,
        month: dhakaDate().month,
        note: "Unlocked by admin without payment",
      });
      return NextResponse.json({ success: true });
    }

    if (action === "runLock") {
      const r = await runCommissionLock({ force: true });
      return NextResponse.json({ success: true, ...r });
    }

    if (action === "setGrace") {
      const days = Math.floor(Number(body.days));
      if (!Number.isFinite(days) || days < 0 || days > 10) {
        return NextResponse.json({ success: false, message: "Grace days must be between 0 and 10." }, { status: 400 });
      }
      await MarketplaceSettings.updateOne({ key: "main" }, { $set: { commissionGraceDays: days } }, { upsert: true });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, message: "Unknown action." }, { status: 400 });
  } catch (error) {
    console.error("Admin commission error:", error);
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Something went wrong." }, { status: 500 });
  }
}
