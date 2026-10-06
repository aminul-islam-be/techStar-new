import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Notification from "@/models/Notification";
import { getAdminSession } from "@/lib/adminAuth";
import { notifyMany } from "@/lib/notify";

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

function noAuth() {
  return json({ success: false, message: "Admin login required." }, 401);
}

/** GET: how many customers will receive an offer + the last offers sent. */
export async function GET() {
  if (!(await getAdminSession())) return noAuth();

  try {
    await connectDB();

    const [customers, recent] = await Promise.all([
      User.countDocuments({ role: "customer", active: true }),
      Notification.aggregate<{
        _id: { title: string; message: string };
        sentAt: Date;
        count: number;
      }>([
        { $match: { type: "offer" } },
        {
          $group: {
            _id: { title: "$title", message: "$message" },
            sentAt: { $max: "$createdAt" },
            count: { $sum: 1 },
          },
        },
        { $sort: { sentAt: -1 } },
        { $limit: 10 },
      ]),
    ]);

    return json({
      success: true,
      customers,
      recent: recent.map((r) => ({
        title: r._id.title,
        message: r._id.message,
        sentAt: r.sentAt,
        count: r.count,
      })),
    });
  } catch (error) {
    console.error("GET admin notifications error:", error);
    return json({ success: false, message: "Unable to load." }, 500);
  }
}

/** POST { title, message, link? }: sends an offer notification to every active customer. */
export async function POST(request: NextRequest) {
  if (!(await getAdminSession())) return noAuth();

  try {
    await connectDB();

    const body = await request.json().catch(() => ({}));

    const title = String(body.title || "").trim().slice(0, 80);
    const message = String(body.message || "").trim().slice(0, 300);
    let link = String(body.link || "").trim();

    if (title.length < 3 || message.length < 3) {
      return json(
        { success: false, message: "Write a title and a message (at least 3 letters each)." },
        400
      );
    }

    // only links inside the website are allowed, e.g. /coupons or /products/slug
    if (link && (!link.startsWith("/") || link.startsWith("//"))) {
      return json(
        { success: false, message: "Link must start with a single / (example: /coupons)." },
        400
      );
    }
    if (!link) link = "";

    const customers = await User.find({ role: "customer", active: true })
      .select("_id")
      .lean();

    if (!customers.length) {
      return json({ success: false, message: "There are no active customers yet." }, 400);
    }

    const sent = await notifyMany(
      customers.map((c) => c._id),
      { type: "offer", icon: "🎁", title, message, link: link || undefined }
    );

    return json({
      success: true,
      message: `Offer sent to ${sent} customer${sent === 1 ? "" : "s"}.`,
      sent,
    });
  } catch (error) {
    console.error("POST admin notifications error:", error);
    return json({ success: false, message: "Unable to send the offer." }, 500);
  }
}
