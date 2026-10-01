import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import Vendor from "@/models/Vendor";
import { getSettings } from "@/lib/marketplace";
import { signVendorToken, setVendorCookie } from "@/lib/vendorAuth";

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();

    const shopName = String(body.shopName || "").trim();
    const ownerName = String(body.ownerName || "").trim();
    const phone = String(body.phone || "").trim();
    const password = String(body.password || "");
    const email = String(body.email || "").trim().toLowerCase();
    const address = String(body.address || "").trim();

    if (!shopName || !ownerName || !phone || !password) {
      return NextResponse.json(
        { success: false, message: "Shop name, your name, phone and password are required." },
        { status: 400 }
      );
    }
    if (!/^[0-9+\-\s]{8,15}$/.test(phone)) {
      return NextResponse.json({ success: false, message: "Please enter a valid phone number." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ success: false, message: "Password must be at least 6 characters." }, { status: 400 });
    }

    if (await Vendor.exists({ phone })) {
      return NextResponse.json(
        { success: false, message: "A vendor account with this phone already exists." },
        { status: 409 }
      );
    }

    const settings = await getSettings();
    const slug = `${slugify(shopName) || "shop"}-${Math.random().toString(36).slice(2, 7)}`;

    const vendor = await Vendor.create({
      shopName,
      slug,
      ownerName,
      phone,
      email: email || undefined,
      address,
      password: await bcrypt.hash(password, 10),
      status: settings.autoApproveVendors ? "approved" : "pending",
    });

    const res = NextResponse.json(
      {
        success: true,
        message: settings.autoApproveVendors
          ? "Your shop is ready. You can start adding products."
          : "Application submitted. You can add products after the admin approves your shop.",
        status: vendor.status,
      },
      { status: 201 }
    );
    setVendorCookie(res, await signVendorToken(String(vendor._id)));
    return res;
  } catch (error) {
    console.error("Vendor register error:", error);
    return NextResponse.json({ success: false, message: "Unable to register." }, { status: 500 });
  }
}
