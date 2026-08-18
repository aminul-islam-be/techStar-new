import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const role = searchParams.get("role")?.trim() || "";

    const filter: Record<string, unknown> = {};

    if (role === "customer" || role === "admin") {
      filter.role = role;
    }

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("GET users error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load users.",
      },
      { status: 500 }
    );
  }
}
export async function PATCH(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { id, active } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "User ID is required.",
        },
        { status: 400 }
      );
    }

    if (typeof active !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          message: "Active must be true or false.",
        },
        { status: 400 }
      );
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set: { active } },
      {
        new: true,
        runValidators: true,
      }
    )
      .select("-password")
      .lean();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: active
        ? "User activated successfully."
        : "User deactivated successfully.",
      user,
    });
  } catch (error) {
    console.error("PATCH users error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to update user.",
      },
      { status: 500 }
    );
  }
}

