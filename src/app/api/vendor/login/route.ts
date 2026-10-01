import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import Vendor from "@/models/Vendor";
import { signVendorToken, setVendorCookie } from "@/lib/vendorAuth";

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const phone = String(body.phone || "").trim();
    const password = String(body.password || "");

    if (!phone || !password) {
      return NextResponse.json({ success: false, message: "Phone and password are required." }, { status: 400 });
    }

    const vendor = await Vendor.findOne({ phone });
    const ok = vendor ? await bcrypt.compare(password, vendor.password) : false;

    if (!vendor || !ok) {
      return NextResponse.json({ success: false, message: "Invalid phone or password." }, { status: 401 });
    }
    if (vendor.status === "rejected") {
      return NextResponse.json({ success: false, message: "Your application was rejected. Please contact support." }, { status: 403 });
    }
    if (vendor.status === "suspended") {
      return NextResponse.json({ success: false, message: "Your shop is suspended. Please contact support." }, { status: 403 });
    }

    const res = NextResponse.json({ success: true, status: vendor.status });
    setVendorCookie(res, await signVendorToken(String(vendor._id)));
    return res;
  } catch (error) {
    console.error("Vendor login error:", error);
    return NextResponse.json({ success: false, message: "Unable to login." }, { status: 500 });
  }
}
