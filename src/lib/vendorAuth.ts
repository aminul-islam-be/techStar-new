import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import connectDB from "@/lib/mongodb";
import Vendor from "@/models/Vendor";

export const VENDOR_COOKIE = "vendor_token";

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured.");
  return new TextEncoder().encode(secret);
}

export async function signVendorToken(vendorId: string) {
  return new SignJWT({ vendorId, type: "vendor" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

export function setVendorCookie(res: NextResponse, token: string) {
  res.cookies.set(VENDOR_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearVendorCookie(res: NextResponse) {
  res.cookies.set(VENDOR_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/**
 * Loads the logged-in vendor (fresh from the DB, so suspensions apply
 * immediately). Returns null if not logged in / blocked.
 * With `requireApproved`, pending vendors are also rejected.
 */
export async function getCurrentVendor(opts: { requireApproved?: boolean } = {}) {
  const token = (await cookies()).get(VENDOR_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.type !== "vendor" || !payload.vendorId) return null;

    await connectDB();
    const vendor = await Vendor.findById(String(payload.vendorId));
    if (!vendor) return null;
    if (vendor.status === "rejected" || vendor.status === "suspended") return null;
    if (opts.requireApproved && vendor.status !== "approved") return null;
    return vendor;
  } catch {
    return null;
  }
}

export function unauthorized(message = "Please login as a vendor.") {
  return NextResponse.json({ success: false, message }, { status: 401 });
}
