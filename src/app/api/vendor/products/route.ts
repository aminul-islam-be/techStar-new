import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import { getCurrentVendor, unauthorized } from "@/lib/vendorAuth";
import { getSettings } from "@/lib/marketplace";
import { findContactInfo, CONTACT_BLOCK_MESSAGE } from "@/lib/chatFilter";

export async function GET() {
  const vendor = await getCurrentVendor();
  if (!vendor) return unauthorized();
  await connectDB();

  const products = await Product.find({ vendorId: vendor._id }).sort({ createdAt: -1 }).lean();
  return NextResponse.json({ success: true, products });
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function POST(request: Request) {
  try {
    const vendor = await getCurrentVendor({ requireApproved: true });
    if (!vendor) {
      return NextResponse.json(
        { success: false, message: "Your shop must be approved before you can add products." },
        { status: 403 }
      );
    }
    await connectDB();

    const body = await request.json();
    const name = String(body.name || "").trim();
    const category = String(body.category || "").trim();
    const description = String(body.description || "").trim();
    const price = Number(body.price);
    const stock = Number(body.stock);
    const compareAtRaw = body.compareAtPrice === "" || body.compareAtPrice == null ? undefined : Number(body.compareAtPrice);
    const image = String(body.image || "").trim();
    const images = Array.isArray(body.images)
      ? body.images.map((u: unknown) => String(u || "").trim()).filter(Boolean).slice(0, 6)
      : [];

    if (!name || !category) {
      return NextResponse.json({ success: false, message: "Name and category are required." }, { status: 400 });
    }
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ success: false, message: "Please enter a valid price." }, { status: 400 });
    }
    if (!Number.isFinite(stock) || stock < 0) {
      return NextResponse.json({ success: false, message: "Please enter a valid stock quantity." }, { status: 400 });
    }

    if (findContactInfo(`${name} ${description}`, "listing")) {
      return NextResponse.json({ success: false, message: CONTACT_BLOCK_MESSAGE }, { status: 400 });
    }

    const settings = await getSettings();
    const product = await Product.create({
      name,
      slug: `${slugify(name) || "product"}-${Math.random().toString(36).slice(2, 7)}`,
      category,
      description,
      price,
      compareAtPrice: compareAtRaw !== undefined && Number.isFinite(compareAtRaw) && compareAtRaw > price ? compareAtRaw : undefined,
      currency: "BDT",
      image: image || images[0] || "",
      images,
      stock: Math.floor(stock),
      featured: false,
      active: true,
      vendorId: vendor._id,
      vendorName: vendor.shopName,
      approvalStatus: settings.autoApproveProducts ? "approved" : "pending",
    });

    return NextResponse.json(
      {
        success: true,
        message: settings.autoApproveProducts
          ? "Product published."
          : "Product submitted. It will go live after admin approval.",
        product,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Vendor add product error:", error);
    return NextResponse.json({ success: false, message: "Unable to add product." }, { status: 500 });
  }
}
