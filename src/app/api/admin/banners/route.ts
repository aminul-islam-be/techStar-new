import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Banner from "@/models/Banner";

export async function GET() {
  try {
    await connectDB();

    const banners = await Banner.find({})
      .sort({ order: 1, createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      banners,
    });
  } catch (error) {
    console.error("GET admin banners error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load banners.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    const {
      title,
      type,
      mediaUrl,
      linkUrl,
      order,
      active,
    } = body;

    if (!type || !["image", "video"].includes(type)) {
      return NextResponse.json(
        {
          success: false,
          message: "A valid banner type is required.",
        },
        { status: 400 }
      );
    }

    if (!mediaUrl) {
      return NextResponse.json(
        {
          success: false,
          message: "Banner media URL is required.",
        },
        { status: 400 }
      );
    }

    const banner = await Banner.create({
      title: title || "",
      type,
      mediaUrl,
      linkUrl: linkUrl || "",
      order: Number(order) || 0,
      active: active !== undefined ? active : true,
    });

    return NextResponse.json({
      success: true,
      banner,
    });
  } catch (error) {
    console.error("POST banner error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to create banner.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Banner ID is required.",
        },
        { status: 400 }
      );
    }

    const banner = await Banner.findByIdAndUpdate(
      id,
      updates,
      { new: true }
    );

    if (!banner) {
      return NextResponse.json(
        {
          success: false,
          message: "Banner not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      banner,
    });
  } catch (error) {
    console.error("PATCH banner error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to update banner.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Banner ID is required.",
        },
        { status: 400 }
      );
    }

    const banner = await Banner.findByIdAndDelete(id);

    if (!banner) {
      return NextResponse.json(
        {
          success: false,
          message: "Banner not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("DELETE banner error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to delete banner.",
      },
      { status: 500 }
    );
  }
}
