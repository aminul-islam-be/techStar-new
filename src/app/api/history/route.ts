import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import History from "@/models/History";
import User from "@/models/User";
import "@/models/Product";

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

    const [user, viewedDocs, searchDocs] = await Promise.all([
      User.findById(userId)
        .select("historyRetentionDays")
        .lean(),
      History.find({ userId, type: "viewed" })
        .sort({ at: -1 })
        .limit(50)
        .populate("productId")
        .lean(),
      History.find({ userId, type: "search" })
        .sort({ at: -1 })
        .limit(50)
        .lean(),
    ]);

    const viewed = viewedDocs.map((doc: any) => ({
      _id: String(doc._id),
      at: doc.at,
      product: doc.productId
        ? {
            _id: String(doc.productId._id),
            name: doc.productId.name,
            slug: doc.productId.slug,
            image: doc.productId.image,
            price: doc.productId.price,
            stock: doc.productId.stock,
          }
        : null,
    }));

    const search = searchDocs.map((doc: any) => ({
      _id: String(doc._id),
      query: doc.query,
      at: doc.at,
    }));

    return NextResponse.json({
      success: true,
      viewed,
      search,
      retentionDays: user?.historyRetentionDays || 30,
    });
  } catch (error) {
    console.error("GET history error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to load history." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();

    const userId = getUserId(request);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { success: false, message: "User ID is required." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all";
    const id = searchParams.get("id");

    if (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json(
          { success: false, message: "Invalid ID." },
          { status: 400 }
        );
      }

      await History.deleteOne({ _id: id, userId });

      return NextResponse.json({ success: true });
    }

    if (type === "viewed" || type === "search") {
      await History.deleteMany({ userId, type });
    } else {
      await History.deleteMany({ userId });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE history error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to update history." },
      { status: 500 }
    );
  }
}
