import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    const fullName = String(body.fullName || "").trim();
    const phone = String(body.phone || "").trim();
    const password = String(body.password || "");
    const email = String(body.email || "").trim().toLowerCase();

    if (!fullName || !phone || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Full name, phone and password are required.",
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message: "Password must be at least 6 characters.",
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

    const user = await User.create({
      fullName,
      phone,
      password,
      ...(email ? { email } : {}),
      role: "customer",
      active: true,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Account created successfully.",
        user: {
          id: user._id.toString(),
          fullName: user.fullName,
          phone: user.phone,
          email: user.email || "",
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to create account.",
      },
      { status: 500 }
    );
  }
}

