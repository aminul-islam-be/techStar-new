import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

function getUserId(request: NextRequest) {
  return request.headers.get("x-user-id")?.trim() || "";
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const userId = getUserId(request);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Please login first.",
        },
        { status: 401 }
      );
    }

    const user = await User.findById(userId)
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
      user: {
        id: user._id.toString(),
        fullName: user.fullName,
        phone: user.phone,
        email: user.email || "",
        permanentAddress: user.permanentAddress || "",
        profilePicture: user.profilePicture || "",
        dateOfBirth: user.dateOfBirth || "",
        gender: user.gender || "",
        bloodGroup: user.bloodGroup || "",
        maritalStatus: user.maritalStatus || "",
        country: user.country || "Bangladesh",
        division: user.division || "",
        area: user.area || "",
        city: user.city || "",
        office: user.office || "",
        study: user.study || "",
        role: user.role,
        active: user.active,
      },
    });
  } catch (error) {
    console.error("Profile GET error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load profile.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectDB();

    const userId = getUserId(request);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Please login first.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const hasProfilePicture =
      typeof body.profilePicture === "string" &&
      body.profilePicture.trim() !== "";

    // Profile picture can be updated independently.
    if (hasProfilePicture) {
      const user = await User.findByIdAndUpdate(
        userId,
        {
          profilePicture:
            body.profilePicture.trim(),
        },
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
        message: "Profile picture updated successfully.",
        user: {
          id: user._id.toString(),
          fullName: user.fullName,
          phone: user.phone,
          email: user.email || "",
          permanentAddress:
            user.permanentAddress || "",
          profilePicture:
            user.profilePicture || "",
          dateOfBirth:
            user.dateOfBirth || "",
          gender: user.gender || "",
          bloodGroup:
            user.bloodGroup || "",
          maritalStatus:
            user.maritalStatus || "",
          country:
            user.country || "Bangladesh",
          division:
            user.division || "",
          area:
            user.area || "",
          city:
            user.city || "",
          office:
            user.office || "",
          study:
            user.study || "",
          role: user.role,
          active: user.active,
        },
      });
    }

    const update = {
      fullName: String(body.fullName || "").trim(),
      email: String(body.email || "").trim(),
      permanentAddress: String(
        body.permanentAddress || ""
      ).trim(),
      dateOfBirth: String(
        body.dateOfBirth || ""
      ).trim(),
      gender: String(
        body.gender || ""
      ).trim(),
      bloodGroup: String(
        body.bloodGroup || ""
      ).trim(),
      maritalStatus: String(
        body.maritalStatus || ""
      ).trim(),
      country: String(
        body.country || "Bangladesh"
      ).trim(),
      division: String(
        body.division || ""
      ).trim(),
      area: String(
        body.area || ""
      ).trim(),
      city: String(
        body.city || ""
      ).trim(),
      office: String(
        body.office || ""
      ).trim(),
      study: String(
        body.study || ""
      ).trim(),
    };

    if (!update.fullName) {
      return NextResponse.json(
        {
          success: false,
          message: "Full name is required.",
        },
        { status: 400 }
      );
    }

    const user = await User.findByIdAndUpdate(
      userId,
      update,
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
      message: "Profile updated successfully.",
      user: {
        id: user._id.toString(),
        fullName: user.fullName,
        phone: user.phone,
        email: user.email || "",
        permanentAddress: user.permanentAddress || "",
        profilePicture: user.profilePicture || "",
        dateOfBirth: user.dateOfBirth || "",
        gender: user.gender || "",
        bloodGroup: user.bloodGroup || "",
        maritalStatus: user.maritalStatus || "",
        country: user.country || "Bangladesh",
        division: user.division || "",
        area: user.area || "",
        city: user.city || "",
        office: user.office || "",
        study: user.study || "",
        role: user.role,
        active: user.active,
      },
    });
  } catch (error) {
    console.error("Profile PATCH error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to update profile.",
      },
      { status: 500 }
    );
  }
}
