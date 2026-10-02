import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { getSettings } from "@/lib/marketplace";

export const dynamic = "force-dynamic";

/** Public: the courier charge for one parcel (the checkout shows it next to every product). */
export async function GET() {
  try {
    await connectDB();
    const s = await getSettings();
    return NextResponse.json({
      success: true,
      insideDhaka: s.courierInsideDhaka ?? 80,
      outsideDhaka: s.courierOutsideDhaka ?? 120,
    });
  } catch {
    return NextResponse.json({ success: true, insideDhaka: 80, outsideDhaka: 120 });
  }
}
