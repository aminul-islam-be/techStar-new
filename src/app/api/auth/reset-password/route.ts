import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { phone, newPassword } = await request.json();

    if (!phone || !newPassword) {
      return NextResponse.json({ success: false, message: "Phone number and new password are required." }, { status: 400 });
    }

    // সরাসরি ডাটাবেজে আপডেট করা হচ্ছে (Mongoose validation বাইপাস করে)
    const user = await User.findOneAndUpdate(
      { phone },
      { $set: { password: newPassword } },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ success: false, message: "No account found with this phone number." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Password updated successfully. You can now login." });
  } catch (error: any) {
    console.error("Reset password error:", error);
    return NextResponse.json({ success: false, message: "Unable to reset password." }, { status: 500 });
  }
}
