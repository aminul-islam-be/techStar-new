import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    const phone = String(body.phone || "").trim();
    const password = String(body.password || "");

    if (!phone || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Phone and password are required.",
        },
        { status: 400 }
      );
    }

    const user = await User.findOne({ phone });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid phone number or password.",
        },
        { status: 401 }
      );
    }

    if (user.password !== password) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid phone number or password.",
        },
        { status: 401 }
      );
    }

    if (!user.active) {
      return NextResponse.json(
        {
          success: false,
          message: "Your account is inactive.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Login successful.",
      user: {
        id: user._id.toString(),
        fullName: user.fullName,
        phone: user.phone,
        email: user.email || "",
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to login.",
      },
      { status: 500 }
    );
  }
}

