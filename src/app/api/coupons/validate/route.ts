import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { checkCoupon } from "@/lib/couponRules";

/**
 * Checkout "Apply" button. Only a PREVIEW: when the order is placed the server
 * checks the coupon again and counts the use, so this can not be cheated.
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const userId = request.headers.get("x-user-id")?.trim() || "";
    const body = await request.json().catch(() => ({}));
    const itemsTotal = Number(body.itemsTotal);

    if (!Number.isFinite(itemsTotal) || itemsTotal <= 0) {
      return NextResponse.json(
        { success: false, message: "Your cart is empty." },
        { status: 400 }
      );
    }

    const result = await checkCoupon(body.code, userId, itemsTotal);

    if (result.ok === false) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      code: result.code,
      discount: result.discount,
      description: result.description,
    });
  } catch (error) {
    console.error("Validate coupon error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to check the coupon." },
      { status: 500 }
    );
  }
}
