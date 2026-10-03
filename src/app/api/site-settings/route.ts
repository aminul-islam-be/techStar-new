import { NextResponse } from "next/server";
import { getSiteSettings } from "@/lib/siteSettings";

export const dynamic = "force-dynamic";

/** Public: the website name, logo and contact info. */
export async function GET() {
  const site = await getSiteSettings();
  return NextResponse.json({ success: true, site }, { headers: { "Cache-Control": "no-store" } });
}
