import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(request: Request) {
  try {
    await connectDB();

    const setupKey = request.headers.get("x-admin-setup-key");
    const requiredKey = process.env.ADMIN_SETUP_KEY;

    if (!requiredKey || setupKey !== requiredKey) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const existingAdmin = await User.findOne({ role: "admin" });

    if (existingAdmin) {
      return NextResponse.json(
        {
          success: false,
          message: "Admin setup has already been completed.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const fullName = String(body.fullName || "").trim();
    const phone = String(body.phone || "").trim();
    const password = String(body.password || "");

    if (!fullName || !phone || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Full name, phone and password are required.",
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          message: "Password must be at least 8 characters.",
        },
        { status: 400 }
      );
    }

    const existingUser = await User.findOne({ phone });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: "This phone number is already registered.",
        },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const admin = await User.create({
      fullName,
      phone,
      password: passwordHash,
      role: "admin",
      active: true,
    });

    return NextResponse.json({
      success: true,
      message: "Admin account created successfully.",
      admin: {
        id: admin._id.toString(),
        fullName: admin.fullName,
        phone: admin.phone,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Admin setup error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to create admin account.",
      },
      { status: 500 }
    );
  }
}
