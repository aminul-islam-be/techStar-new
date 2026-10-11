import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { getAdminSession } from "@/lib/adminAuth";
import { isAdminSection } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

const ROLES = ["customer", "moderator", "admin"];

const noAuth = () =>
  NextResponse.json({ success: false, message: "Admin login required." }, { status: 401 });

// Team management is for the main admin only. Calling without a section refuses moderators.
export async function GET(request: NextRequest) {
  if (!(await getAdminSession())) return noAuth();

  try {
    await connectDB();

    const search = (request.nextUrl.searchParams.get("search") || "").trim().slice(0, 60);

    const team = await User.find({ role: { $in: ["admin", "moderator"] } })
      .select("-password")
      .sort({ role: 1, createdAt: 1 })
      .lean();

    let customers: unknown[] = [];

    if (search) {
      // Escape the text so it is searched literally.
      const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      customers = await User.find({
        role: "customer",
        $or: [
          { fullName: { $regex: safe, $options: "i" } },
          { phone: { $regex: safe, $options: "i" } },
        ],
      })
        .select("-password")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();
    }

    return NextResponse.json({ success: true, team, customers });
  } catch (error) {
    console.error("GET team error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to load team." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return noAuth();

  try {
    const body = await request.json();
    const id = String(body.id || "");
    const role = String(body.role || "");

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Valid user is required." },
        { status: 400 }
      );
    }

    if (!ROLES.includes(role)) {
      return NextResponse.json(
        { success: false, message: "Role must be customer, moderator or admin." },
        { status: 400 }
      );
    }

    if (id === session.userId && role !== "admin") {
      return NextResponse.json(
        { success: false, message: "You cannot remove your own admin role." },
        { status: 400 }
      );
    }

    const permissions = Array.isArray(body.permissions)
      ? Array.from(new Set(body.permissions.filter(isAdminSection)))
      : [];

    if (role === "moderator" && permissions.length === 0) {
      return NextResponse.json(
        { success: false, message: "Give a moderator at least one section." },
        { status: 400 }
      );
    }

    await connectDB();

    // updateOne skips schema validation, so older account data cannot block the change.
    const result = await User.updateOne(
      { _id: id },
      { $set: { role, permissions: role === "moderator" ? permissions : [] } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404 }
      );
    }

    const user = await User.findById(id).select("-password").lean();

    return NextResponse.json({
      success: true,
      message:
        role === "customer"
          ? "Access removed. The user is now a customer."
          : `Saved as ${role}.`,
      user,
    });
  } catch (error) {
    console.error("PATCH team error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to update role." },
      { status: 500 }
    );
  }
}
