import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Review from "@/models/Review";
import {
  getCurrentVendor,
  unauthorized,
} from "@/lib/vendorAuth";

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const vendor =
    await getCurrentVendor({
      requireApproved: true,
    });

  if (!vendor) {
    return unauthorized();
  }

  try {
    await connectDB();

    const { id } =
      await params;

    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid review id.",
        },
        { status: 400 }
      );
    }

    const body =
      await request
        .json()
        .catch(() => ({}));

    const reply = String(
      body.reply || ""
    )
      .trim()
      .slice(0, 1000);

    if (reply.length < 2) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please write a reply.",
        },
        { status: 400 }
      );
    }

    const review =
      await Review.findOne({
        _id: id,
        vendorId: vendor._id,
        status: "approved",
      });

    if (!review) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Review not found or not assigned to your shop.",
        },
        { status: 404 }
      );
    }

    review.sellerReply =
      reply;

    review.sellerReplyAt =
      new Date();

    await review.save();

    return NextResponse.json({
      success: true,
      message:
        "Seller reply saved.",
    });
  } catch (error) {
    console.error(
      "PATCH seller review reply error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to save reply.",
      },
      { status: 500 }
    );
  }
}
