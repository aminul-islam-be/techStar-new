import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Coupon from "@/models/Coupon";
import CouponUsage from "@/models/CouponUsage";

/** Public list for the customer's Coupons page: only live, public coupons. */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const now = new Date();
    const userId = request.headers.get("x-user-id")?.trim() || "";

    const coupons = await Coupon.find({
      isActive: true,
      isPublic: true,
      expiryDate: { $gte: now },
      $or: [{ startDate: { $exists: false } }, { startDate: null }, { startDate: { $lte: now } }],
    })
      .sort({ expiryDate: 1 })
      .limit(50)
      .lean();

    const live = coupons.filter(
      (c) => !(c.usageLimit > 0 && c.usedCount >= c.usageLimit)
    );

    // which of them did THIS customer already use up?
    const usedByMe = new Map<string, number>();

    if (mongoose.Types.ObjectId.isValid(userId) && live.length) {
      const rows = await CouponUsage.aggregate<{ _id: unknown; n: number }>([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            status: "used",
            couponId: { $in: live.map((c) => c._id) },
          },
        },
        { $group: { _id: "$couponId", n: { $sum: 1 } } },
      ]);

      for (const row of rows) usedByMe.set(String(row._id), row.n);
    }

    return NextResponse.json({
      success: true,
      coupons: live.map((c) => ({
        _id: String(c._id),
        code: c.code,
        description: c.description || "",
        discountType: c.discountType,
        discountValue: c.discountValue,
        minOrder: c.minOrder,
        maxDiscount: c.maxDiscount || 0,
        expiryDate: c.expiryDate,
        alreadyUsed:
          c.perUserLimit > 0 && (usedByMe.get(String(c._id)) || 0) >= c.perUserLimit,
      })),
    });
  } catch (error) {
    console.error("GET coupons error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to load coupons." },
      { status: 500 }
    );
  }
}
