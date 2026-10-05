import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Review from "@/models/Review";
import Product from "@/models/Product";
import { getAdminSession } from "@/lib/adminAuth";
import { recalcProductRating } from "@/lib/reviewStats";

const STATUSES = ["pending", "approved", "rejected"] as const;
type ReviewStatus = (typeof STATUSES)[number];

function noAuth() {
  return NextResponse.json(
    { success: false, message: "Admin login required." },
    { status: 401 }
  );
}

export async function GET(request: NextRequest) {
  if (!(await getAdminSession())) {
    return noAuth();
  }

  try {
    await connectDB();

    const status =
      new URL(request.url).searchParams.get("status") || "pending";

    const filter =
      status === "all"
        ? {}
        : STATUSES.includes(status as ReviewStatus)
          ? { status: status as ReviewStatus }
          : { status: "pending" as ReviewStatus };

    const reviews = await Review.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    const products = await Product.find({
      _id: { $in: reviews.map((item) => item.productId) },
    })
      .select("name slug vendorName")
      .lean();

    const productMap = new Map(
      products.map((item) => [String(item._id), item])
    );

    return NextResponse.json({
      success: true,
      reviews: reviews.map((item) => ({
        ...item,
        _id: String(item._id),
        productId: String(item.productId),
        userId: String(item.userId),
        vendorId: item.vendorId ? String(item.vendorId) : "",
        product: productMap.get(String(item.productId)) || null,
      })),
    });
  } catch (error) {
    console.error("GET admin reviews error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to load reviews." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  if (!(await getAdminSession())) {
    return noAuth();
  }

  try {
    await connectDB();

    const body = await request.json().catch(() => ({}));

    const id = String(body.id || "");
    const status = String(body.status || "");
    const adminNote = String(body.adminNote || "").trim().slice(0, 500);

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !STATUSES.includes(status as ReviewStatus)
    ) {
      return NextResponse.json(
        { success: false, message: "Review id and valid status are required." },
        { status: 400 }
      );
    }

    const review = await Review.findByIdAndUpdate(
      id,
      { $set: { status, adminNote } },
      { new: true }
    ).lean();

    if (!review) {
      return NextResponse.json(
        { success: false, message: "Review not found." },
        { status: 404 }
      );
    }

    // keep the product's star average + review count in sync
    await recalcProductRating(review.productId);

    return NextResponse.json({
      success: true,
      message: `Review ${status}.`,
    });
  } catch (error) {
    console.error("PATCH admin review error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to update review." },
      { status: 500 }
    );
  }
}
