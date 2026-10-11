import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { attachUserCookie } from "@/lib/userSession";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    const phone = String(body.phone || "").trim();
    const password = String(body.password || "");

    if (!phone || !password) {
      return NextResponse.json(
        { success: false, message: "Phone and password are required." },
        { status: 400 }
      );
    }

    const user = await User.findOne({ phone });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid phone number or password." },
        { status: 401 }
      );
    }

    // passwords are bcrypt hashes. Accounts made before this change still hold plain text:
    // they are accepted once and upgraded to a hash right away.
    const stored = String(user.password || "");
    const isHash = stored.startsWith("$2");
    const passwordOk = isHash ? await bcrypt.compare(password, stored) : stored === password;
    if (!passwordOk) {
      return NextResponse.json(
        { success: false, message: "Invalid phone number or password." },
        { status: 401 }
      );
    }
    if (!isHash) {
      await User.updateOne({ _id: user._id }, { $set: { password: await bcrypt.hash(password, 10) } });
    }

    if (!user.active) {
      return NextResponse.json(
        { success: false, message: "Your account is inactive." },
        { status: 403 }
      );
    }

    const res = NextResponse.json({
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

    // signed httpOnly session cookie: this is what the review API trusts
    await attachUserCookie(res, user._id.toString());

    return res;
  } catch (error) {
    console.error("Login error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to login." },
      { status: 500 }
    );
  }
}
