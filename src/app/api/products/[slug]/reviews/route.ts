import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import Review from "@/models/Review";
import User from "@/models/User";
import Order from "@/models/Order";

function cleanImages(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];

  return value
    .map((item) => String(item || "").trim())
    .filter((item) => /^https?:\/\//i.test(item))
    .slice(0, 3);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();

    const { slug } = await params;

    const product = await Product.findOne({
      slug,
      active: true,
      approvalStatus: { $in: ["approved", null] },
    }).lean();

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message: "Product not found.",
        },
        { status: 404 }
      );
    }

    const reviews = await Review.find({
      productId: product._id,
      status: "approved",
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const count = reviews.length;

    const average = count
      ? Number(
          (
            reviews.reduce(
              (sum, item) => sum + item.rating,
              0
            ) / count
          ).toFixed(1)
        )
      : 0;

    const distribution = [5, 4, 3, 2, 1].reduce<
      Record<string, number>
    >((out, rating) => {
      out[String(rating)] = reviews.filter(
        (item) => item.rating === rating
      ).length;

      return out;
    }, {});

    const userId =
      request.headers.get("x-user-id")?.trim() || "";

    let verifiedPurchase = false;
    let myReview = null;

    if (mongoose.Types.ObjectId.isValid(userId)) {
      verifiedPurchase = !!(
        await Order.exists({
          userId,
          status: "delivered",
          "items.productId": product._id,
        })
      );

      myReview = await Review.findOne({
        productId: product._id,
        userId,
      }).lean();
    }

    return NextResponse.json({
      success: true,

      summary: {
        count,
        average,
        distribution,
      },

      verifiedPurchase,

      myReview: myReview
        ? {
            _id: String(myReview._id),
            rating: myReview.rating,
            title: myReview.title || "",
            comment: myReview.comment,
            images: myReview.images || [],
            verifiedPurchase:
              myReview.verifiedPurchase,
            status: myReview.status,
            sellerReply:
              myReview.sellerReply || "",
            sellerReplyAt:
              myReview.sellerReplyAt || null,
          }
        : null,

      reviews: reviews.map((item) => ({
        _id: String(item._id),
        userName: item.userName,
        userProfilePicture:
          item.userProfilePicture || "",
        rating: item.rating,
        title: item.title || "",
        comment: item.comment,
        images: item.images || [],
        verifiedPurchase:
          item.verifiedPurchase,
        sellerReply:
          item.sellerReply || "",
        sellerReplyAt:
          item.sellerReplyAt || null,
        createdAt: item.createdAt,
      })),
    });
  } catch (error) {
    console.error(
      "GET product reviews error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load reviews.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();

    const { slug } = await params;

    const userId =
      request.headers.get("x-user-id")?.trim() || "";

    if (
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please login before writing a review.",
        },
        { status: 401 }
      );
    }

    const user =
      await User.findById(userId).lean();

    if (
      !user ||
      !user.active ||
      user.role !== "customer"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Only active customers can write reviews.",
        },
        { status: 403 }
      );
    }

    const product =
      await Product.findOne({
        slug,
        active: true,
        approvalStatus: {
          $in: ["approved", null],
        },
      });

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message: "Product not found.",
        },
        { status: 404 }
      );
    }

    // শুধুমাত্র delivered order-এর customer review করতে পারবে
    const order =
      await Order.findOne({
        userId,
        status: "delivered",
        "items.productId": product._id,
      }).lean();

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Only customers who received this product can review it.",
        },
        { status: 403 }
      );
    }

    const existing =
      await Review.findOne({
        productId: product._id,
        userId,
      }).lean();

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You have already reviewed this product.",
        },
        { status: 409 }
      );
    }

    const body =
      await request.json().catch(() => ({}));

    const rating = Number(body.rating);

    const title = String(
      body.title || ""
    )
      .trim()
      .slice(0, 120);

    const comment = String(
      body.comment || ""
    )
      .trim()
      .slice(0, 1500);

    const images = cleanImages(body.images);

    if (
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please choose a rating from 1 to 5.",
        },
        { status: 400 }
      );
    }

    if (comment.length < 3) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please write a short review.",
        },
        { status: 400 }
      );
    }

    const review =
      await Review.create({
        productId: product._id,
        userId: user._id,

        ...(product.vendorId
          ? { vendorId: product.vendorId }
          : {}),

        userName: user.fullName,

        userProfilePicture:
          user.profilePicture || "",

        rating,
        title,
        comment,
        images,

        verifiedPurchase: true,

        // আগে admin approve করবে
        status: "pending",
      });

    return NextResponse.json(
      {
        success: true,
        message:
          "Review submitted. It will appear after approval.",

        review: {
          _id: String(review._id),
          status: review.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: number }).code ===
        11000
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You have already reviewed this product.",
        },
        { status: 409 }
      );
    }

    console.error(
      "POST product review error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to submit review.",
      },
      { status: 500 }
    );
  }
}
