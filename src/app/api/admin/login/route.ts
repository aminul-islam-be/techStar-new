import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

import connectDB from "@/lib/mongodb";
import User from "@/models/User";

function getSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("AUTH_SECRET is not configured.");
  }

  return new TextEncoder().encode(secret);
}

export async function POST(request: Request) {
  try {
    await connectDB();

    const contentType = request.headers.get("content-type") || "";
    const isJsonRequest = contentType.includes("application/json");

    let phone = "";
    let password = "";

    // JSON request হলে
    if (isJsonRequest) {
      const body = await request.json();
      phone = String(body.phone || "").trim();
      password = String(body.password || "");
    } else {
      // Normal HTML form request হলে
      const formData = await request.formData();
      phone = String(formData.get("phone") || "").trim();
      password = String(formData.get("password") || "");
    }

    // Phone অথবা password missing
    if (!phone || !password) {
      return NextResponse.json(
        { success: false, message: "Phone number and password are required." },
        { status: 400 }
      );
    }

    // Admin user খোঁজা
    const user = await User.findOne({
      phone,
      role: { $in: ["admin", "moderator"] },
      active: true,
    }).select("+password");

    // Admin পাওয়া না গেলে
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid admin credentials." },
        { status: 401 }
      );
    }

    // Password verify
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return NextResponse.json(
        { success: false, message: "Invalid admin credentials." },
        { status: 401 }
      );
    }

    // JWT token তৈরি
    const token = await new SignJWT({
      userId: user._id.toString(),
      role: user.role,
      phone: user.phone,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(getSecret());

    // Form দিয়ে login হলে সরাসরি admin dashboard-এ পাঠানো হবে।
    // Location relative রাখা হয়েছে, যাতে Codespace-এর proxy-র বাইরে localhost-এ চলে না যায়।
    const response = isJsonRequest
      ? NextResponse.json({
          success: true,
          message: "Admin login successful.",
          admin: {
            id: user._id.toString(),
            fullName: user.fullName,
            phone: user.phone,
            role: user.role,
          },
        })
      : new NextResponse(null, {
          status: 303,
          headers: { Location: "/admin" },
        });

    // Admin cookie save
    response.cookies.set("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Admin login error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to login." },
      { status: 500 }
    );
  }
}
