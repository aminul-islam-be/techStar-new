import { NextResponse } from "next/server";

/**
 * Turned OFF on purpose. This route used to change ANY customer's password knowing only
 * the phone number: no code was sent to the phone and nothing was checked.
 * It comes back only with a real one-time code (SMS / OTP) sent to the customer's phone.
 */
export async function POST() {
  return NextResponse.json(
    { success: false, message: "Password reset is temporarily unavailable. Please contact support." },
    { status: 503 }
  );
}
