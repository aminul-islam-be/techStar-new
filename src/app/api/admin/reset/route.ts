import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

// Temporary admin recovery route. Delete this file once admin login works.
export async function POST(request: Request) {
  // Check the setup key first, so nobody without it gets any information.
  const setupKey = request.headers.get("x-admin-setup-key");
  const requiredKey = process.env.ADMIN_SETUP_KEY;

  if (!requiredKey || setupKey !== requiredKey) {
    return NextResponse.json(
      { success: false, message: "Unauthorized." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const phone = String(body.phone || "").trim();
    const password = String(body.password || "");

    if (!phone || password.length < 8) {
      return NextResponse.json(
        { success: false, message: "Valid phone and password are required." },
        { status: 400 }
      );
    }

    await connectDB();
    const hashedPassword = await bcrypt.hash(password, 12);

    const existing = await User.findOne({ phone }).select("_id").lean();

    if (existing) {
      // updateOne skips schema validation, so odd old data on the account cannot block the reset.
      await User.updateOne(
        { phone },
        { $set: { password: hashedPassword, role: "admin", active: true } }
      );
    } else {
      await User.create({
        fullName: "TechStar Admin",
        phone,
        password: hashedPassword,
        role: "admin",
        active: true,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Admin credentials updated successfully.",
      phone,
    });
  } catch (error) {
    const err = error as { name?: string; message?: string };
    console.error("Admin reset error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Unable to update admin credentials.",
        detail: (err?.name || "Error") + ": " + (err?.message || ""),
      },
      { status: 500 }
    );
  }
}
