import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Notification from "@/models/Notification";
import { getSessionUserId } from "@/lib/userSession";

type Ctx = { params: Promise<{ id: string }> };

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

async function ownerAndId(ctx: Ctx) {
  const { id } = await ctx.params;
  const userId = await getSessionUserId();

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return {
      error: json(
        { success: false, message: "Please login again to see notifications." },
        401
      ),
    };
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { error: json({ success: false, message: "Notification not found." }, 404) };
  }

  return { id, userId };
}

/** PATCH { isRead: true | false } */
export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const who = await ownerAndId(ctx);
    if ("error" in who) return who.error;

    await connectDB();

    const body = await request.json().catch(() => ({}));
    const isRead = body.isRead !== false;

    const updated = await Notification.findOneAndUpdate(
      { _id: who.id, userId: who.userId },
      { $set: { isRead } },
      { new: true }
    ).lean();

    if (!updated) {
      return json({ success: false, message: "Notification not found." }, 404);
    }

    return json({ success: true, isRead: updated.isRead });
  } catch (error) {
    console.error("PATCH notification error:", error);
    return json({ success: false, message: "Unable to update notification." }, 500);
  }
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  try {
    const who = await ownerAndId(ctx);
    if ("error" in who) return who.error;

    await connectDB();

    const deleted = await Notification.findOneAndDelete({
      _id: who.id,
      userId: who.userId,
    });

    if (!deleted) {
      return json({ success: false, message: "Notification not found." }, 404);
    }

    return json({ success: true, message: "Notification deleted." });
  } catch (error) {
    console.error("DELETE notification error:", error);
    return json({ success: false, message: "Unable to delete notification." }, 500);
  }
}
