import mongoose from "mongoose";
import Coupon from "@/models/Coupon";
import CouponUsage from "@/models/CouponUsage";

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function normalizeCode(value: unknown) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

/** How much a coupon takes off the PRODUCT total (courier is never discounted). */
export function calcDiscount(
  coupon: { discountType: string; discountValue: number; maxDiscount?: number },
  itemsTotal: number
) {
  let discount =
    coupon.discountType === "percentage"
      ? (itemsTotal * coupon.discountValue) / 100
      : coupon.discountValue;

  if (
    coupon.discountType === "percentage" &&
    coupon.maxDiscount &&
    coupon.maxDiscount > 0
  ) {
    discount = Math.min(discount, coupon.maxDiscount);
  }

  // never more than the products cost
  return round2(Math.max(0, Math.min(discount, itemsTotal)));
}

export type CouponCheck =
  | {
      ok: true;
      couponId: string;
      code: string;
      discount: number;
      description: string;
    }
  | { ok: false; message: string };

/** Is this code usable by this customer for this product total? (does NOT count a use) */
export async function checkCoupon(
  codeInput: unknown,
  userId: string,
  itemsTotal: number
): Promise<CouponCheck> {
  const code = normalizeCode(codeInput);

  if (!code) return { ok: false, message: "Please enter a coupon code." };

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return { ok: false, message: "Please login to use a coupon." };
  }

  const coupon = await Coupon.findOne({ code });

  if (!coupon) return { ok: false, message: "This coupon code is not valid." };
  if (!coupon.isActive) return { ok: false, message: "This coupon is not active." };

  const now = new Date();

  if (coupon.startDate && now < coupon.startDate) {
    return { ok: false, message: "This coupon is not active yet." };
  }
  if (now > coupon.expiryDate) {
    return { ok: false, message: "This coupon has expired." };
  }
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, message: "This coupon has been fully used." };
  }
  if (itemsTotal < coupon.minOrder) {
    return {
      ok: false,
      message: `Minimum order amount for this coupon is ৳${coupon.minOrder}.`,
    };
  }

  if (coupon.perUserLimit > 0) {
    const mine = await CouponUsage.countDocuments({
      couponId: coupon._id,
      userId,
      status: "used",
    });

    if (mine >= coupon.perUserLimit) {
      return { ok: false, message: "You have already used this coupon." };
    }
  }

  const discount = calcDiscount(coupon, itemsTotal);

  if (discount <= 0) {
    return { ok: false, message: "This coupon gives no discount on this order." };
  }

  return {
    ok: true,
    couponId: String(coupon._id),
    code: coupon.code,
    discount,
    description: coupon.description || "",
  };
}

/**
 * Validates AND counts one use, atomically (two people can not both take the last use).
 * If the order then fails to save, call releaseCouponCount(couponId).
 */
export async function redeemCoupon(
  codeInput: unknown,
  userId: string,
  itemsTotal: number
): Promise<CouponCheck> {
  const check = await checkCoupon(codeInput, userId, itemsTotal);
  if (check.ok === false) return check;

  const taken = await Coupon.findOneAndUpdate(
    {
      _id: check.couponId,
      isActive: true,
      expiryDate: { $gte: new Date() },
      $or: [
        { usageLimit: 0 },
        { $expr: { $lt: ["$usedCount", "$usageLimit"] } },
      ],
    },
    { $inc: { usedCount: 1 } },
    { new: true }
  );

  if (!taken) return { ok: false, message: "This coupon has been fully used." };

  return check;
}

export async function releaseCouponCount(couponId: string) {
  try {
    await Coupon.updateOne(
      { _id: couponId, usedCount: { $gt: 0 } },
      { $inc: { usedCount: -1 } }
    );
  } catch (error) {
    console.error("releaseCouponCount error:", error);
  }
}

/** Saves "this customer used this coupon on this order". */
export async function recordCouponUsage(data: {
  couponId: string;
  code: string;
  userId: string;
  orderId: unknown;
  discount: number;
}) {
  try {
    await CouponUsage.create({
      couponId: new mongoose.Types.ObjectId(data.couponId),
      code: data.code,
      userId: new mongoose.Types.ObjectId(data.userId),
      orderId: new mongoose.Types.ObjectId(String(data.orderId)),
      discountAmount: data.discount,
      status: "used",
    });
  } catch (error) {
    console.error("recordCouponUsage error:", error);
  }
}

/** The order was cancelled: the customer gets the coupon use back. Safe to call twice. */
export async function releaseCouponForOrder(orderId: unknown) {
  try {
    const usage = await CouponUsage.findOneAndUpdate(
      { orderId: new mongoose.Types.ObjectId(String(orderId)), status: "used" },
      { $set: { status: "released" } }
    );

    if (usage) await releaseCouponCount(String(usage.couponId));
  } catch (error) {
    console.error("releaseCouponForOrder error:", error);
  }
}

/* ---------- admin: clean + validate the create / edit form ---------- */

export function cleanCouponBody(
  body: Record<string, unknown>,
  options: { requireCode: boolean }
) {
  const code = normalizeCode(body.code);
  const description = String(body.description || "").trim().slice(0, 120);
  const discountType: "fixed" | "percentage" =
    body.discountType === "fixed" ? "fixed" : "percentage";
  const discountValue = Number(body.discountValue);
  const minOrder = Number(body.minOrder || 0);
  const maxDiscountRaw = body.maxDiscount;
  const maxDiscount =
    maxDiscountRaw === "" || maxDiscountRaw === null || maxDiscountRaw === undefined
      ? undefined
      : Number(maxDiscountRaw);
  const usageLimit = Number(body.usageLimit ?? 0);
  const perUserLimit = Number(body.perUserLimit ?? 1);
  const expiryDate = new Date(String(body.expiryDate || ""));
  const startDate = body.startDate ? new Date(String(body.startDate)) : undefined;

  if (options.requireCode && !/^[A-Z0-9_-]{3,20}$/.test(code)) {
    return { error: "Code must be 3-20 letters, numbers, - or _ (no spaces)." };
  }
  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    return { error: "Discount value must be more than 0." };
  }
  if (discountType === "percentage" && discountValue > 100) {
    return { error: "A percentage discount can not be more than 100." };
  }
  if (!Number.isFinite(minOrder) || minOrder < 0) {
    return { error: "Minimum order can not be negative." };
  }
  if (maxDiscount !== undefined && (!Number.isFinite(maxDiscount) || maxDiscount <= 0)) {
    return { error: "Maximum discount must be more than 0 (or leave it empty)." };
  }
  if (!Number.isInteger(usageLimit) || usageLimit < 0) {
    return { error: "Usage limit must be 0 (unlimited) or a whole number." };
  }
  if (!Number.isInteger(perUserLimit) || perUserLimit < 0) {
    return { error: "Per-customer limit must be 0 (unlimited) or a whole number." };
  }
  if (Number.isNaN(expiryDate.getTime())) {
    return { error: "Please choose an expiry date." };
  }
  if (startDate && Number.isNaN(startDate.getTime())) {
    return { error: "Start date is not valid." };
  }
  if (startDate && startDate > expiryDate) {
    return { error: "Start date must be before the expiry date." };
  }

  // the coupon is valid until the END of the chosen expiry day
  expiryDate.setHours(23, 59, 59, 999);

  return {
    data: {
      ...(options.requireCode ? { code } : {}),
      description,
      discountType,
      discountValue,
      minOrder,
      maxDiscount: discountType === "percentage" ? maxDiscount : undefined,
      usageLimit,
      perUserLimit,
      startDate,
      expiryDate,
      isPublic: body.isPublic !== false,
    },
  };
}
