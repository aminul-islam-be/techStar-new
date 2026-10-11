import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { ADMIN_SECTIONS, isAdminSection, type AdminSection } from "@/lib/adminPermissions";

export type AdminSession = {
  userId: string;
  role: "admin" | "moderator";
  phone: string;
  permissions: AdminSection[];
};

/**
 * Returns the admin or moderator session from the httpOnly `admin_token` cookie, or null.
 *
 * - admin: allowed everywhere.
 * - moderator: allowed only for the section passed in, e.g. getAdminSession("orders"),
 *   and only if that section is in the moderator's permissions.
 * - no section given: moderators are refused.
 *
 * The account is checked in the database on every call, so a demotion or a
 * deactivation takes effect at once, not when the 7-day token runs out.
 */
export async function getAdminSession(section?: AdminSection): Promise<AdminSession | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  const token = (await cookies()).get("admin_token")?.value;
  if (!token) return null;

  let userId = "";
  let phone = "";

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    userId = String(payload.userId || "");
    phone = String(payload.phone || "");
  } catch {
    return null;
  }

  if (!userId) return null;

  try {
    await connectDB();

    const user = await User.findById(userId).select("role active permissions").lean();
    if (!user || !user.active) return null;

    if (user.role === "admin") {
      return { userId, role: "admin", phone, permissions: [...ADMIN_SECTIONS] };
    }

    if (user.role === "moderator" && section) {
      const permissions = (user.permissions || []).filter(isAdminSection);
      if (permissions.includes(section)) {
        return { userId, role: "moderator", phone, permissions };
      }
    }

    return null;
  } catch {
    return null;
  }
}
