import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";

/**
 * Customer login session (httpOnly cookie).
 * The server trusts THIS cookie, not the x-user-id header the browser sends,
 * because anybody can type any x-user-id by hand.
 */
export const USER_COOKIE = "user_token";

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

export async function signUserToken(userId: string) {
  const key = secretKey();
  if (!key) throw new Error("AUTH_SECRET is not configured.");

  return new SignJWT({ userId, type: "user" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(key);
}

/** Call this right after a successful login / register. Never throws. */
export async function attachUserCookie(res: NextResponse, userId: string) {
  try {
    const token = await signUserToken(userId);

    res.cookies.set(USER_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  } catch (error) {
    console.error("Customer session cookie was not set:", error);
  }
}

export function clearUserCookie(res: NextResponse) {
  res.cookies.set(USER_COOKIE, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
}

/** The verified customer id from the cookie, or "" when not logged in. */
export async function getSessionUserId(): Promise<string> {
  const key = secretKey();
  if (!key) return "";

  const token = (await cookies()).get(USER_COOKIE)?.value;
  if (!token) return "";

  try {
    const { payload } = await jwtVerify(token, key);

    if (payload.type !== "user" || typeof payload.userId !== "string") {
      return "";
    }

    return payload.userId;
  } catch {
    return "";
  }
}
