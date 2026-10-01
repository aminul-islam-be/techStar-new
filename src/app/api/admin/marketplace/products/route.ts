import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import { getAdminSession } from "@/lib/adminAuth";
import { generateProductDetails } from "@/lib/productDetailsAI";

const noAuth = () => NextResponse.json({ success: false, message: "Admin login required." }, { status: 401 });

export async function GET(request: NextRequest) {
  if (!(await getAdminSession())) return noAuth();
  await connectDB();

  const status = new URL(request.url).searchParams.get("status") || "pending";
  const filter: Record<string, unknown> = { vendorId: { $exists: true, $ne: null } };
  if (["pending", "approved", "rejected", "suspended"].includes(status)) filter.approvalStatus = status;

  const products = await Product.find(filter).sort({ createdAt: -1 }).limit(200).lean();
  return NextResponse.json({ success: true, products });
}

export async function PATCH(request: NextRequest) {
  if (!(await getAdminSession())) return noAuth();
  await connectDB();

  const { id, action, reason } = await request.json();
  if (!id || !mongoose.Types.ObjectId.isValid(id) || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ success: false, message: "Product id and a valid action are required." }, { status: 400 });
  }

  const product = await Product.findOneAndUpdate(
    { _id: id, vendorId: { $exists: true, $ne: null } },
    action === "approve"
      ? { $set: { approvalStatus: "approved" }, $unset: { rejectionReason: "" } }
      : { $set: { approvalStatus: "rejected", rejectionReason: String(reason || "").trim() || "Not approved by admin." } },
    { new: true }
  );
  if (!product) return NextResponse.json({ success: false, message: "Product not found." }, { status: 404 });

  // Same automatic "Product Details" page the admin products get.
  if (action === "approve") {
    try {
      await generateProductDetails({
        _id: String(product._id),
        name: product.name,
        category: product.category,
        description: product.description,
        price: product.price,
        stock: product.stock,
        ingredients: [],
      });
    } catch (error) {
      console.error("Auto product-details failed:", error);
    }
  }

  return NextResponse.json({ success: true, product });
}
