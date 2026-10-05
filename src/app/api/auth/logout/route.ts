import { NextResponse } from "next/server";
import { clearUserCookie } from "@/lib/userSession";

export async function POST() {
  const res = NextResponse.json({ success: true });
  clearUserCookie(res);
  return res;
}
