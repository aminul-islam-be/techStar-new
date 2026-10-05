import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Review from "@/models/Review";
import Product from "@/models/Product";
import {
  getCurrentVendor,
  unauthorized,
} from "@/lib/vendorAuth";

export async function GET() {
  const vendor =
    await getCurrentVendor({
      requireApproved: true,
    });

  if (!vendor) {
    return unauthorized();
  }

  try {
    await connectDB();

    const reviews =
      await Review.find({
        vendorId: vendor._id,
        status: "approved",
      })
        .sort({ createdAt: -1 })
        .limit(200)
        .lean();

    const products =
      await Product.find({
        _id: {
          $in: reviews.map(
            (r) => r.productId
          ),
        },
      })
        .select("name slug")
        .lean();

    const map =
      new Map(
        products.map((p) => [
          String(p._id),
          p,
        ])
      );

    return NextResponse.json({
      success: true,

      reviews: reviews.map(
        (r) => ({
          ...r,

          _id: String(r._id),

          productId:
            String(r.productId),

          product:
            map.get(
              String(r.productId)
            ) || null,
        })
      ),
    });
  } catch (error) {
    console.error(
      "GET vendor reviews error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to load reviews.",
      },
      { status: 500 }
    );
  }
}
