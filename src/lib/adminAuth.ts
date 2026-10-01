import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export type AdminSession = { userId: string; role: string; phone: string };

/** Returns the admin session from the httpOnly `admin_token` cookie, or null. */
export async function getAdminSession(): Promise<AdminSession | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  const token = (await cookies()).get("admin_token")?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    if (payload.role !== "admin") return null;
    return payload as unknown as AdminSession;
  } catch {
    return null;
  }
}
