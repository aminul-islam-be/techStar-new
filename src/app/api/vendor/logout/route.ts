import { NextResponse } from "next/server";
import { clearVendorCookie } from "@/lib/vendorAuth";

export async function POST() {
  const res = NextResponse.json({ success: true });
  clearVendorCookie(res);
  return res;
}
