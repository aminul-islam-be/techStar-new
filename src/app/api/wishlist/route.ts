import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Wishlist from "@/models/Wishlist";
import Product from "@/models/Product";

function getUserId(request: NextRequest) {
  return request.headers.get("x-user-id")?.trim() || "";
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const userId = getUserId(request);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        {
          success: false,
          message: "User ID is required.",
        },
        { status: 401 }
      );
    }

    const wishlist = await Wishlist.findOne({ userId }).lean();

    const productIds = wishlist?.productIds || [];

    const products = productIds.length
      ? await Product.find({ _id: { $in: productIds } }).lean()
      : [];

    return NextResponse.json({
      success: true,
      products,
    });
  } catch (error) {
    console.error("GET wishlist error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load wishlist.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const userId = getUserId(request);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        {
          success: false,
          message: "User ID is required.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const productId = body.productId;

    if (
      !productId ||
      !mongoose.Types.ObjectId.isValid(productId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid product ID is required.",
        },
        { status: 400 }
      );
    }

    const product = await Product.findById(productId).lean();

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message: "Product not found.",
        },
        { status: 404 }
      );
    }

    const wishlist = await Wishlist.findOneAndUpdate(
      { userId },
      {
        $addToSet: {
          productIds: new mongoose.Types.ObjectId(productId),
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      message: "Added to wishlist.",
      wishlist,
    });
  } catch (error) {
    console.error("POST wishlist error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to update wishlist.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();

    const userId = getUserId(request);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        {
          success: false,
          message: "User ID is required.",
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const productId =
      searchParams.get("productId")?.trim() || "";

    if (!productId) {
      await Wishlist.findOneAndUpdate(
        { userId },
        { $set: { productIds: [] } }
      );

      return NextResponse.json({
        success: true,
        message: "Wishlist cleared.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid product ID.",
        },
        { status: 400 }
      );
    }

    await Wishlist.findOneAndUpdate(
      { userId },
      {
        $pull: {
          productIds: new mongoose.Types.ObjectId(productId),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: "Removed from wishlist.",
    });
  } catch (error) {
    console.error("DELETE wishlist error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to update wishlist.",
      },
      { status: 500 }
    );
  }
}
