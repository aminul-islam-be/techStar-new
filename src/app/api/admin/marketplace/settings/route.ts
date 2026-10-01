import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Vendor from "@/models/Vendor";
import Product from "@/models/Product";
import Payout from "@/models/Payout";
import MarketplaceSettings from "@/models/MarketplaceSettings";
import { getAdminSession } from "@/lib/adminAuth";
import { getSettings } from "@/lib/marketplace";

const noAuth = () => NextResponse.json({ success: false, message: "Admin login required." }, { status: 401 });

/** Settings + your platform earnings summary. */
export async function GET() {
  if (!(await getAdminSession())) return noAuth();
  await connectDB();

  const [settings, totals, pendingVendors, pendingProducts, pendingPayouts] = await Promise.all([
    getSettings(),
    Vendor.aggregate([
      {
        $group: {
          _id: null,
          commission: { $sum: "$totalCommission" },
          sales: { $sum: "$totalSales" },
          vendorShare: { $sum: "$totalEarned" },
          owedToVendors: { $sum: { $add: ["$balance", "$pendingPayout"] } },
          paidOut: { $sum: "$totalWithdrawn" },
        },
      },
    ]),
    Vendor.countDocuments({ status: "pending" }),
    Product.countDocuments({ vendorId: { $exists: true, $ne: null }, approvalStatus: "pending" }),
    Payout.countDocuments({ status: "pending" }),
  ]);

  const t = totals[0] || { commission: 0, sales: 0, vendorShare: 0, owedToVendors: 0, paidOut: 0 };

  return NextResponse.json({
    success: true,
    settings,
    summary: {
      platformCommission: t.commission, // your earnings
      vendorSales: t.sales,
      vendorShare: t.vendorShare,
      owedToVendors: t.owedToVendors,
      paidOut: t.paidOut,
      pendingVendors,
      pendingProducts,
      pendingPayouts,
    },
  });
}

export async function PUT(request: NextRequest) {
  if (!(await getAdminSession())) return noAuth();
  await connectDB();

  const body = await request.json();
  const update: Record<string, unknown> = {};

  if (body.defaultCommissionRate !== undefined) {
    const rate = Number(body.defaultCommissionRate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 50) {
      return NextResponse.json({ success: false, message: "Commission must be between 0 and 50 percent." }, { status: 400 });
    }
    update.defaultCommissionRate = rate;
  }
  if (body.minWithdrawal !== undefined) {
    const min = Number(body.minWithdrawal);
    if (!Number.isFinite(min) || min < 0) {
      return NextResponse.json({ success: false, message: "Invalid minimum withdrawal." }, { status: 400 });
    }
    update.minWithdrawal = min;
  }
  if (typeof body.autoApproveVendors === "boolean") update.autoApproveVendors = body.autoApproveVendors;
  if (typeof body.autoApproveProducts === "boolean") update.autoApproveProducts = body.autoApproveProducts;

  const settings = await MarketplaceSettings.findOneAndUpdate(
    { key: "main" },
    { $set: update },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  return NextResponse.json({ success: true, settings });
}
