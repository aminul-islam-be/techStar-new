import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Notification from "@/models/Notification";
import { getSessionUserId } from "@/lib/userSession";

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

function loginAgain() {
  return json(
    { success: false, message: "Please login again to see notifications." },
    401
  );
}

// "stock" tab also shows old "product" rows
function typeFilter(tab: string) {
  if (tab === "order") return "order";
  if (tab === "offer") return "offer";
  if (tab === "stock") return { $in: ["stock", "product"] };
  return null;
}

/**
 * GET /api/notifications?type=all|order|offer|stock
 * GET /api/notifications?countOnly=1   (just the unread number for the bell)
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!mongoose.Types.ObjectId.isValid(userId)) return loginAgain();

    await connectDB();

    const owner = new mongoose.Types.ObjectId(userId);
    const params = new URL(request.url).searchParams;

    if (params.get("countOnly") === "1") {
      const unread = await Notification.countDocuments({
        userId: owner,
        isRead: false,
      });
      return json({ success: true, unread });
    }

    const tab = params.get("type") || "all";
    const filter: Record<string, unknown> = { userId: owner };
    const wanted = typeFilter(tab);
    if (wanted) filter.type = wanted;

    const [list, grouped] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).limit(100).lean(),
      Notification.aggregate<{
        _id: { type: string; isRead: boolean };
        n: number;
      }>([
        { $match: { userId: owner } },
        { $group: { _id: { type: "$type", isRead: "$isRead" }, n: { $sum: 1 } } },
      ]),
    ]);

    const tabs = {
      all: { total: 0, unread: 0 },
      order: { total: 0, unread: 0 },
      offer: { total: 0, unread: 0 },
      stock: { total: 0, unread: 0 },
    };

    for (const row of grouped) {
      const key = row._id.type === "product" ? "stock" : row._id.type;
      const bucket = tabs[key as keyof typeof tabs];

      tabs.all.total += row.n;
      if (!row._id.isRead) tabs.all.unread += row.n;

      if (bucket) {
        bucket.total += row.n;
        if (!row._id.isRead) bucket.unread += row.n;
      }
    }

    return json({
      success: true,
      unread: tabs.all.unread,
      tabs,
      notifications: list.map((n) => ({
        _id: String(n._id),
        type: n.type,
        icon: n.icon || "",
        title: n.title,
        message: n.message,
        link: n.link || "",
        isRead: n.isRead,
        createdAt: n.createdAt,
      })),
    });
  } catch (error) {
    console.error("GET notifications error:", error);
    return json({ success: false, message: "Unable to load notifications." }, 500);
  }
}

/** PATCH { action: "markAllRead", type?: "order" | "offer" | "stock" } */
export async function PATCH(request: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!mongoose.Types.ObjectId.isValid(userId)) return loginAgain();

    await connectDB();

    const body = await request.json().catch(() => ({}));

    if (body.action !== "markAllRead") {
      return json({ success: false, message: "Unknown action." }, 400);
    }

    const filter: Record<string, unknown> = {
      userId: new mongoose.Types.ObjectId(userId),
      isRead: false,
    };
    const wanted = typeFilter(String(body.type || "all"));
    if (wanted) filter.type = wanted;

    const result = await Notification.updateMany(filter, {
      $set: { isRead: true },
    });

    return json({
      success: true,
      message: "All notifications marked as read.",
      updated: result.modifiedCount,
    });
  } catch (error) {
    console.error("PATCH notifications error:", error);
    return json({ success: false, message: "Unable to update notifications." }, 500);
  }
}

/** DELETE /api/notifications?scope=read | all */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!mongoose.Types.ObjectId.isValid(userId)) return loginAgain();

    await connectDB();

    const scope = new URL(request.url).searchParams.get("scope");

    if (scope !== "read" && scope !== "all") {
      return json({ success: false, message: "Use scope=read or scope=all." }, 400);
    }

    const filter: Record<string, unknown> = {
      userId: new mongoose.Types.ObjectId(userId),
    };
    if (scope === "read") filter.isRead = true;

    const result = await Notification.deleteMany(filter);

    return json({
      success: true,
      message: scope === "read" ? "Read notifications cleared." : "All notifications cleared.",
      deleted: result.deletedCount,
    });
  } catch (error) {
    console.error("DELETE notifications error:", error);
    return json({ success: false, message: "Unable to clear notifications." }, 500);
  }
}
