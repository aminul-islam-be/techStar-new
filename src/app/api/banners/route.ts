import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Banner from "@/models/Banner";

export async function GET() {
  try {
    await connectDB();

    const banners = await Banner.find({ active: true })
      .sort({ order: 1, createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      banners,
    });
  } catch (error) {
    console.error("GET banners error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load banners.",
      },
      { status: 500 }
    );
  }
}
