import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { getAdminSession } from "@/lib/adminAuth";
import { runCommissionLock } from "@/lib/commissionBilling";

export const dynamic = "force-dynamic";

/**
 * Runs every day (see vercel.json). It only does something once a month, on the
 * lock day. Allowed for the scheduler (CRON_SECRET) or a logged-in admin.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const fromScheduler = Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;

  if (!fromScheduler && !(await getAdminSession())) {
    return NextResponse.json({ success: false, message: "Not allowed." }, { status: 401 });
  }

  try {
    await connectDB();
    const result = await runCommissionLock({ force: false });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Commission lock job error:", error);
    return NextResponse.json({ success: false, message: "Job failed." }, { status: 500 });
  }
}
