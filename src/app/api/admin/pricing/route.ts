import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import MarketplaceSettings from "@/models/MarketplaceSettings";
import { getAdminSession } from "@/lib/adminAuth";
import { getSettings } from "@/lib/marketplace";

const noAuth = () => NextResponse.json({ success: false, message: "Admin login required." }, { status: 401 });

const pick = (s: Awaited<ReturnType<typeof getSettings>>) => ({
  defaultCommissionRate: s.defaultCommissionRate,
  commissionMin: s.commissionMin ?? 10,
  commissionMax: s.commissionMax ?? 20,
  courierInsideDhaka: s.courierInsideDhaka ?? 80,
  courierOutsideDhaka: s.courierOutsideDhaka ?? 120,
});

export async function GET() {
  if (!(await getAdminSession())) return noAuth();
  await connectDB();
  return NextResponse.json({ success: true, pricing: pick(await getSettings()) });
}

/** Changes apply to NEW orders only. Old orders keep the amounts they were placed with. */
export async function PUT(request: NextRequest) {
  if (!(await getAdminSession())) return noAuth();
  await connectDB();

  const b = await request.json();
  const rate = Number(b.defaultCommissionRate);
  const min = Number(b.commissionMin);
  const max = Number(b.commissionMax);
  const inside = Number(b.courierInsideDhaka);
  const outside = Number(b.courierOutsideDhaka);

  const bad = (message: string) => NextResponse.json({ success: false, message }, { status: 400 });

  if (!Number.isFinite(rate) || rate < 0 || rate > 50) return bad("Commission % must be between 0 and 50.");
  if (!Number.isFinite(min) || min < 0 || min > 1000) return bad("Minimum commission must be between 0 and 1000.");
  if (!Number.isFinite(max) || max < min || max > 5000) return bad("Maximum commission must be at least the minimum (and at most 5000).");
  for (const [n, v] of [["Inside Dhaka", inside], ["Outside Dhaka", outside]] as const) {
    if (!Number.isFinite(v) || v < 0 || v > 2000) return bad(`${n} courier charge must be between 0 and 2000.`);
  }

  const saved = await MarketplaceSettings.findOneAndUpdate(
    { key: "main" },
    {
      $set: {
        defaultCommissionRate: rate,
        commissionMin: min,
        commissionMax: max,
        courierInsideDhaka: inside,
        courierOutsideDhaka: outside,
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  ).lean();

  return NextResponse.json({ success: true, pricing: pick(saved as Awaited<ReturnType<typeof getSettings>>) });
}
