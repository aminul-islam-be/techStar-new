import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import History from "@/models/History";

function getUserId(request: NextRequest) {
  return request.headers.get("x-user-id")?.trim() || "";
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const userId = getUserId(request);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { success: false, message: "User ID is required." },
        { status: 401 }
      );
    }

    const user = await User.findById(userId)
      .select("historyRetentionDays")
      .lean();

    return NextResponse.json({
      success: true,
      retentionDays: user?.historyRetentionDays || 30,
    });
  } catch (error) {
    console.error("GET history settings error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to load settings." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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
    const retentionDays = Number(body.retentionDays);

    if (![1, 7, 30].includes(retentionDays)) {
      return NextResponse.json(
        {
          success: false,
          message: "Retention must be 1, 7, or 30 days.",
        },
        { status: 400 }
      );
    }

    // Step 1 (critical): save the user's chosen retention period.
    await User.findByIdAndUpdate(userId, {
      historyRetentionDays: retentionDays,
    });

    // Step 2 (best-effort): re-apply the new window to existing
    // entries too. If this fails for any reason (older MongoDB
    // version, etc.) it must NOT block the response above — new
    // entries will use the new setting regardless.
    try {
      const retentionMs = retentionDays * 24 * 60 * 60 * 1000;

      const allEntries = await History.find({
        userId: new mongoose.Types.ObjectId(userId),
      })
        .select("_id at")
        .lean();

      await Promise.all(
        allEntries.map((entry: any) =>
          History.updateOne(
            { _id: entry._id },
            {
              $set: {
                expiresAt: new Date(
                  new Date(entry.at).getTime() + retentionMs
                ),
              },
            }
          )
        )
      );
    } catch (recalcError) {
      console.error(
        "History retention recalculation skipped:",
        recalcError
      );
    }

    return NextResponse.json({
      success: true,
      retentionDays,
    });
  } catch (error) {
    console.error("PUT history settings error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to update settings." },
      { status: 500 }
    );
  }
}
