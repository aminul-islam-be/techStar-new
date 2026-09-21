import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // ইউজার পেমেন্ট ক্যানসেল করলে তাকে আবার চেকআউট পেজে ফেরত পাঠাবে
  const baseUrl = new URL(request.url).origin;
  return NextResponse.redirect(`${baseUrl}/checkout?payment=cancelled`, 303);
}
