import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import Review from "@/models/Review";
import User from "@/models/User";
import Order from "@/models/Order";
import { getSessionUserId } from "@/lib/userSession";
import { recalcProductRating } from "@/lib/reviewStats";

type Ctx = { params: Promise<{ slug: string }> };

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

function isAllowedImage(url: string) {
  try {
    const parsed = new URL(url);

    return (
      parsed.protocol === "https:" &&
      (parsed.hostname === "res.cloudinary.com" ||
        parsed.hostname.endsWith(".cloudinary.com"))
    );
  } catch {
    return false;
  }
}

function cleanImages(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];

  return value
    .map((item) => String(item || "").trim())
    .filter(isAllowedImage)
    .slice(0, 3);
}

function readReviewBody(body: Record<string, unknown>) {
  const rating = Number(body.rating);
  const title = String(body.title || "").trim().slice(0, 120);
  const comment = String(body.comment || "").trim().slice(0, 1500);
  const images = cleanImages(body.images);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Please choose a rating from 1 to 5." };
  }

  if (comment.length < 3) {
    return { error: "Please write a short review." };
  }

  return { data: { rating, title, comment, images } };
}

function findProduct(slug: string) {
  return Product.findOne({
    slug,
    active: true,
    approvalStatus: { $in: ["approved", null] },
  });
}

/* ------------------------------------------------------------------ */
/* GET: public approved reviews + summary + the logged-in customer's   */
/* own review / permission to review                                   */
/* ------------------------------------------------------------------ */
export async function GET(_request: NextRequest, { params }: Ctx) {
  try {
    await connectDB();

    const { slug } = await params;
    const product = await findProduct(slug).lean();

    if (!product) {
      return json({ success: false, message: "Product not found." }, 404);
    }

    const [reviews, stats] = await Promise.all([
      Review.find({ productId: product._id, status: "approved" })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
      Review.aggregate<{ _id: number; count: number }>([
        { $match: { productId: product._id, status: "approved" } },
        { $group: { _id: "$rating", count: { $sum: 1 } } },
      ]),
    ]);

    const distribution: Record<string, number> = {
      "1": 0,
      "2": 0,
      "3": 0,
      "4": 0,
      "5": 0,
    };

    let count = 0;
    let total = 0;

    for (const row of stats) {
      distribution[String(row._id)] = row.count;
      count += row.count;
      total += row._id * row.count;
    }

    const average = count ? Number((total / count).toFixed(1)) : 0;

    const userId = await getSessionUserId();
    const loggedIn = mongoose.Types.ObjectId.isValid(userId);

    let verifiedPurchase = false;
    let myReview = null;

    if (loggedIn) {
      verifiedPurchase = !!(await Order.exists({
        userId,
        status: "delivered",
        "items.productId": product._id,
      }));

      myReview = await Review.findOne({
        productId: product._id,
        userId,
      }).lean();
    }

    return json({
      success: true,
      loggedIn,
      summary: { count, average, distribution },
      verifiedPurchase,

      myReview: myReview
        ? {
            _id: String(myReview._id),
            rating: myReview.rating,
            title: myReview.title || "",
            comment: myReview.comment,
            images: myReview.images || [],
            verifiedPurchase: myReview.verifiedPurchase,
            status: myReview.status,
            adminNote: myReview.adminNote || "",
            sellerReply: myReview.sellerReply || "",
            sellerReplyAt: myReview.sellerReplyAt || null,
          }
        : null,

      reviews: reviews.map((item) => ({
        _id: String(item._id),
        userName: item.userName,
        userProfilePicture: item.userProfilePicture || "",
        rating: item.rating,
        title: item.title || "",
        comment: item.comment,
        images: item.images || [],
        verifiedPurchase: item.verifiedPurchase,
        sellerReply: item.sellerReply || "",
        sellerReplyAt: item.sellerReplyAt || null,
        createdAt: item.createdAt,
      })),
    });
  } catch (error) {
    console.error("GET product reviews error:", error);
    return json({ success: false, message: "Unable to load reviews." }, 500);
  }
}

/* ------------------------------------------------------------------ */
/* POST: write a review (only after the product was delivered)         */
/* ------------------------------------------------------------------ */
export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    await connectDB();

    const { slug } = await params;
    const userId = await getSessionUserId();

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return json(
        { success: false, message: "Please login before writing a review." },
        401
      );
    }

    const user = await User.findById(userId).lean();

    if (!user || !user.active || user.role !== "customer") {
      return json(
        { success: false, message: "Only active customers can write reviews." },
        403
      );
    }

    const product = await findProduct(slug);

    if (!product) {
      return json({ success: false, message: "Product not found." }, 404);
    }

    // only a customer whose order was delivered can review
    const order = await Order.findOne({
      userId,
      status: "delivered",
      "items.productId": product._id,
    }).lean();

    if (!order) {
      return json(
        {
          success: false,
          message: "Only customers who received this product can review it.",
        },
        403
      );
    }

    const existing = await Review.findOne({
      productId: product._id,
      userId,
    }).lean();

    if (existing) {
      return json(
        { success: false, message: "You have already reviewed this product." },
        409
      );
    }

    const parsed = readReviewBody(await request.json().catch(() => ({})));

    if ("error" in parsed) {
      return json({ success: false, message: parsed.error }, 400);
    }

    const review = await Review.create({
      productId: product._id,
      userId: user._id,
      ...(product.vendorId ? { vendorId: product.vendorId } : {}),
      userName: user.fullName,
      userProfilePicture: user.profilePicture || "",
      ...parsed.data,
      verifiedPurchase: true,
      // admin approves first
      status: "pending",
    });

    return json(
      {
        success: true,
        message: "Review submitted. It will appear after approval.",
        review: { _id: String(review._id), status: review.status },
      },
      201
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    ) {
      return json(
        { success: false, message: "You have already reviewed this product." },
        409
      );
    }

    console.error("POST product review error:", error);
    return json({ success: false, message: "Unable to submit review." }, 500);
  }
}

/* ------------------------------------------------------------------ */
/* PATCH: customer edits their own review (goes back to "pending")     */
/* ------------------------------------------------------------------ */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    await connectDB();

    const { slug } = await params;
    const userId = await getSessionUserId();

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return json(
        { success: false, message: "Please login again to edit your review." },
        401
      );
    }

    const product = await findProduct(slug);

    if (!product) {
      return json({ success: false, message: "Product not found." }, 404);
    }

    const review = await Review.findOne({ productId: product._id, userId });

    if (!review) {
      return json(
        { success: false, message: "You have not reviewed this product yet." },
        404
      );
    }

    const parsed = readReviewBody(await request.json().catch(() => ({})));

    if ("error" in parsed) {
      return json({ success: false, message: parsed.error }, 400);
    }

    const wasApproved = review.status === "approved";

    review.rating = parsed.data.rating;
    review.title = parsed.data.title;
    review.comment = parsed.data.comment;
    review.images = parsed.data.images;
    review.status = "pending"; // admin checks the new text again
    review.adminNote = "";

    await review.save();

    if (wasApproved) {
      await recalcProductRating(product._id);
    }

    return json({
      success: true,
      message: "Review updated. It will appear again after approval.",
    });
  } catch (error) {
    console.error("PATCH product review error:", error);
    return json({ success: false, message: "Unable to update review." }, 500);
  }
}

/* ------------------------------------------------------------------ */
/* DELETE: customer deletes their own review                           */
/* ------------------------------------------------------------------ */
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  try {
    await connectDB();

    const { slug } = await params;
    const userId = await getSessionUserId();

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return json(
        { success: false, message: "Please login again to delete your review." },
        401
      );
    }

    const product = await findProduct(slug);

    if (!product) {
      return json({ success: false, message: "Product not found." }, 404);
    }

    const deleted = await Review.findOneAndDelete({
      productId: product._id,
      userId,
    });

    if (!deleted) {
      return json(
        { success: false, message: "You have not reviewed this product yet." },
        404
      );
    }

    await recalcProductRating(product._id);

    return json({ success: true, message: "Your review was deleted." });
  } catch (error) {
    console.error("DELETE product review error:", error);
    return json({ success: false, message: "Unable to delete review." }, 500);
  }
}
