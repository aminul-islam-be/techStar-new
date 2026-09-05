import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import History from "@/models/History";
import User from "@/models/User";

function getUserId(request: NextRequest) {
  return request.headers.get("x-user-id")?.trim() || "";
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const userId = getUserId(request);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { success: false, message: "User ID is required." },
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

    const user = await User.findById(userId)
      .select("historyRetentionDays")
      .lean();

    const retentionDays = user?.historyRetentionDays || 30;
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + retentionDays * 24 * 60 * 60 * 1000
    );

    await History.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(userId),
        type: "viewed",
        productId: new mongoose.Types.ObjectId(productId),
      },
      {
        $set: { at: now, expiresAt },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST history viewed error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to save view history.",
      },
      { status: 500 }
    );
  }
}
