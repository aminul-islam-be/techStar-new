import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Address from "@/models/Address";
import { getSessionUserId } from "@/lib/userSession";
import {
  MAX_ADDRESSES,
  addressDto,
  cleanAddressBody,
} from "@/lib/addressRules";

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

function loginAgain() {
  return json(
    { success: false, message: "Please login again to use saved addresses." },
    401
  );
}

/** GET: all saved addresses of the logged-in customer (default first). */
export async function GET() {
  try {
    const userId = await getSessionUserId();

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return loginAgain();
    }

    await connectDB();

    const list = await Address.find({ userId })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();

    return json({ success: true, addresses: list.map(addressDto) });
  } catch (error) {
    console.error("GET addresses error:", error);
    return json({ success: false, message: "Unable to load addresses." }, 500);
  }
}

/** POST: add a new address. The first address automatically becomes default. */
export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId();

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return loginAgain();
    }

    await connectDB();

    const body = await request.json().catch(() => ({}));
    const parsed = cleanAddressBody(body);

    if ("error" in parsed) {
      return json({ success: false, message: parsed.error }, 400);
    }

    const count = await Address.countDocuments({ userId });

    if (count >= MAX_ADDRESSES) {
      return json(
        {
          success: false,
          message: `You can save up to ${MAX_ADDRESSES} addresses. Delete one first.`,
        },
        400
      );
    }

    const makeDefault = body.isDefault === true || count === 0;

    if (makeDefault) {
      await Address.updateMany({ userId }, { $set: { isDefault: false } });
    }

    const created = await Address.create({
      userId,
      ...parsed.data,
      isDefault: makeDefault,
    });

    return json(
      {
        success: true,
        message: "Address saved.",
        address: addressDto(created),
      },
      201
    );
  } catch (error) {
    console.error("POST address error:", error);
    return json({ success: false, message: "Unable to save address." }, 500);
  }
}
