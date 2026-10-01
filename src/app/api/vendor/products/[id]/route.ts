import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import { getCurrentVendor, unauthorized } from "@/lib/vendorAuth";
import { getSettings } from "@/lib/marketplace";
import { findContactInfo, CONTACT_BLOCK_MESSAGE } from "@/lib/chatFilter";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const vendor = await getCurrentVendor({ requireApproved: true });
  if (!vendor) return unauthorized("Your shop must be approved.");
  await connectDB();

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Invalid product id." }, { status: 400 });
  }

  // A vendor can only touch their own products.
  const product = await Product.findOne({ _id: id, vendorId: vendor._id });
  if (!product) {
    return NextResponse.json({ success: false, message: "Product not found." }, { status: 404 });
  }

  const body = await request.json();
  if (findContactInfo(`${body.name || ""} ${body.description || ""}`, "listing")) {
    return NextResponse.json({ success: false, message: CONTACT_BLOCK_MESSAGE }, { status: 400 });
  }

  let needsReview = false;

  if (typeof body.name === "string" && body.name.trim() && body.name.trim() !== product.name) {
    product.name = body.name.trim();
    needsReview = true;
  }
  if (typeof body.category === "string" && body.category.trim() && body.category.trim() !== product.category) {
    product.category = body.category.trim();
    needsReview = true;
  }
  if (typeof body.description === "string" && body.description.trim() !== product.description) {
    product.description = body.description.trim();
    needsReview = true;
  }
  if (typeof body.image === "string" && body.image.trim() !== product.image) {
    product.image = body.image.trim();
    needsReview = true;
  }
  if (Array.isArray(body.images)) {
    product.images = body.images.map((u: unknown) => String(u || "").trim()).filter(Boolean).slice(0, 6);
    needsReview = true;
  }

  // Price, stock and on/off don't need a new review.
  if (body.price !== undefined) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ success: false, message: "Invalid price." }, { status: 400 });
    }
    product.price = price;
  }
  if (body.compareAtPrice !== undefined) {
    const c = body.compareAtPrice === "" || body.compareAtPrice === null ? undefined : Number(body.compareAtPrice);
    product.compareAtPrice = c !== undefined && Number.isFinite(c) && c > product.price ? c : undefined;
  }
  if (body.stock !== undefined) {
    const stock = Number(body.stock);
    if (!Number.isFinite(stock) || stock < 0) {
      return NextResponse.json({ success: false, message: "Invalid stock." }, { status: 400 });
    }
    product.stock = Math.floor(stock);
  }
  if (typeof body.active === "boolean") product.active = body.active;

  if (needsReview && product.approvalStatus !== "suspended") {
    const settings = await getSettings();
    if (!settings.autoApproveProducts) {
      product.approvalStatus = "pending";
      product.rejectionReason = undefined;
    }
  }

  await product.save();
  return NextResponse.json({ success: true, product });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const vendor = await getCurrentVendor();
  if (!vendor) return unauthorized();
  await connectDB();

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Invalid product id." }, { status: 400 });
  }

  const result = await Product.deleteOne({ _id: id, vendorId: vendor._id });
  if (!result.deletedCount) {
    return NextResponse.json({ success: false, message: "Product not found." }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
