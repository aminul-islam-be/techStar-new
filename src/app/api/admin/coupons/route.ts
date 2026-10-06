import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Coupon from "@/models/Coupon";
import CouponUsage from "@/models/CouponUsage";
import User from "@/models/User";
import { getAdminSession } from "@/lib/adminAuth";
import { cleanCouponBody } from "@/lib/couponRules";

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

function noAuth() {
  return json({ success: false, message: "Admin login required." }, 401);
}

function statusOf(c: {
  isActive: boolean;
  startDate?: Date | null;
  expiryDate: Date;
  usageLimit: number;
  usedCount: number;
}) {
  const now = new Date();
  if (!c.isActive) return "inactive";
  if (now > c.expiryDate) return "expired";
  if (c.usageLimit > 0 && c.usedCount >= c.usageLimit) return "used up";
  if (c.startDate && now < c.startDate) return "scheduled";
  return "active";
}

/**
 * GET                  all coupons (newest first) + totals
 * GET ?usage=<id>      who used one coupon (last 50 orders)
 */
export async function GET(request: NextRequest) {
  if (!(await getAdminSession())) return noAuth();

  try {
    await connectDB();

    const usageOf = new URL(request.url).searchParams.get("usage");

    if (usageOf) {
      if (!mongoose.Types.ObjectId.isValid(usageOf)) {
        return json({ success: false, message: "Invalid coupon id." }, 400);
      }

      const rows = await CouponUsage.find({ couponId: usageOf })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      const users = await User.find({ _id: { $in: rows.map((r) => r.userId) } })
        .select("fullName phone")
        .lean();
      const byId = new Map(users.map((u) => [String(u._id), u]));

      return json({
        success: true,
        usage: rows.map((r) => ({
          _id: String(r._id),
          orderId: String(r.orderId),
          customer: byId.get(String(r.userId))?.fullName || "Customer",
          phone: byId.get(String(r.userId))?.phone || "",
          discountAmount: r.discountAmount,
          status: r.status,
          createdAt: r.createdAt,
        })),
      });
    }

    const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();

    const given = await CouponUsage.aggregate<{ _id: unknown; total: number }>([
      { $match: { status: "used" } },
      { $group: { _id: "$couponId", total: { $sum: "$discountAmount" } } },
    ]);
    const givenBy = new Map(given.map((g) => [String(g._id), g.total]));

    return json({
      success: true,
      coupons: coupons.map((c) => ({
        _id: String(c._id),
        code: c.code,
        description: c.description || "",
        discountType: c.discountType,
        discountValue: c.discountValue,
        minOrder: c.minOrder,
        maxDiscount: c.maxDiscount || 0,
        startDate: c.startDate || null,
        expiryDate: c.expiryDate,
        usageLimit: c.usageLimit,
        usedCount: c.usedCount,
        perUserLimit: c.perUserLimit,
        isPublic: c.isPublic,
        isActive: c.isActive,
        status: statusOf(c),
        totalDiscountGiven: givenBy.get(String(c._id)) || 0,
      })),
    });
  } catch (error) {
    console.error("GET admin coupons error:", error);
    return json({ success: false, message: "Unable to load coupons." }, 500);
  }
}

/** POST: create a coupon. */
export async function POST(request: NextRequest) {
  if (!(await getAdminSession())) return noAuth();

  try {
    await connectDB();

    const body = await request.json().catch(() => ({}));
    const parsed = cleanCouponBody(body, { requireCode: true });

    if ("error" in parsed) {
      return json({ success: false, message: parsed.error }, 400);
    }

    const exists = await Coupon.exists({ code: parsed.data.code });
    if (exists) {
      return json(
        { success: false, message: "A coupon with this code already exists." },
        409
      );
    }

    const coupon = await Coupon.create({ ...parsed.data, isActive: true });

    return json(
      { success: true, message: `Coupon ${coupon.code} created.` },
      201
    );
  } catch (error) {
    console.error("POST admin coupon error:", error);
    return json({ success: false, message: "Unable to create the coupon." }, 500);
  }
}

/**
 * PATCH { id, isActive }  turn on / off
 * PATCH { id, ...fields } edit (the code itself can not change)
 */
export async function PATCH(request: NextRequest) {
  if (!(await getAdminSession())) return noAuth();

  try {
    await connectDB();

    const body = await request.json().catch(() => ({}));
    const id = String(body.id || "");

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return json({ success: false, message: "Invalid coupon id." }, 400);
    }

    const coupon = await Coupon.findById(id);
    if (!coupon) return json({ success: false, message: "Coupon not found." }, 404);

    // simple on / off switch
    if (typeof body.isActive === "boolean" && body.discountValue === undefined) {
      coupon.isActive = body.isActive;
      await coupon.save();

      return json({
        success: true,
        message: `Coupon ${coupon.code} is now ${coupon.isActive ? "active" : "turned off"}.`,
      });
    }

    const parsed = cleanCouponBody(body, { requireCode: false });

    if ("error" in parsed) {
      return json({ success: false, message: parsed.error }, 400);
    }

    coupon.set({
      ...parsed.data,
      maxDiscount: parsed.data.maxDiscount ?? undefined,
      startDate: parsed.data.startDate ?? undefined,
    });
    await coupon.save();

    return json({ success: true, message: `Coupon ${coupon.code} updated.` });
  } catch (error) {
    console.error("PATCH admin coupon error:", error);
    return json({ success: false, message: "Unable to update the coupon." }, 500);
  }
}

/** DELETE ?id=  only a coupon nobody used yet. Otherwise turn it off. */
export async function DELETE(request: NextRequest) {
  if (!(await getAdminSession())) return noAuth();

  try {
    await connectDB();

    const id = new URL(request.url).searchParams.get("id") || "";

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return json({ success: false, message: "Invalid coupon id." }, 400);
    }

    const coupon = await Coupon.findById(id);
    if (!coupon) return json({ success: false, message: "Coupon not found." }, 404);

    const used = await CouponUsage.exists({ couponId: id });

    if (used || coupon.usedCount > 0) {
      return json(
        {
          success: false,
          message: "This coupon was already used, so it can not be deleted. Turn it off instead.",
        },
        409
      );
    }

    await coupon.deleteOne();

    return json({ success: true, message: `Coupon ${coupon.code} deleted.` });
  } catch (error) {
    console.error("DELETE admin coupon error:", error);
    return json({ success: false, message: "Unable to delete the coupon." }, 500);
  }
}
