import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Vendor from "@/models/Vendor";
import Product from "@/models/Product";
import { getAdminSession } from "@/lib/adminAuth";
import { getSettings } from "@/lib/marketplace";

const noAuth = () => NextResponse.json({ success: false, message: "Admin login required." }, { status: 401 });

export async function GET(request: NextRequest) {
  if (!(await getAdminSession())) return noAuth();
  await connectDB();

  const status = new URL(request.url).searchParams.get("status") || "";
  const filter: Record<string, unknown> = ["pending", "approved", "suspended", "rejected"].includes(status) ? { status } : {};

  const [vendors, settings] = await Promise.all([
    Vendor.find(filter).select("-password").sort({ createdAt: -1 }).lean(),
    getSettings(),
  ]);

  return NextResponse.json({ success: true, vendors, defaultCommissionRate: settings.defaultCommissionRate });
}

export async function PATCH(request: NextRequest) {
  if (!(await getAdminSession())) return noAuth();
  await connectDB();

  const body = await request.json();
  const { id } = body;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Vendor id is required." }, { status: 400 });
  }

  const update: Record<string, unknown> = {};

  if (body.status !== undefined) {
    if (!["pending", "approved", "suspended", "rejected"].includes(body.status)) {
      return NextResponse.json({ success: false, message: "Invalid status." }, { status: 400 });
    }
    update.status = body.status;
  }

  // commissionRate: a number (0-50) for this vendor, or null to use the default.
  if (body.commissionRate !== undefined) {
    if (body.commissionRate === null || body.commissionRate === "") {
      update.commissionRate = null;
    } else {
      const rate = Number(body.commissionRate);
      if (!Number.isFinite(rate) || rate < 0 || rate > 50) {
        return NextResponse.json({ success: false, message: "Commission must be between 0 and 50 percent." }, { status: 400 });
      }
      update.commissionRate = rate;
    }
  }
  if (typeof body.adminNote === "string") update.adminNote = body.adminNote.trim();

  const vendor = await Vendor.findByIdAndUpdate(id, { $set: update }, { new: true }).select("-password").lean();
  if (!vendor) return NextResponse.json({ success: false, message: "Vendor not found." }, { status: 404 });

  // Suspending hides the shop's products; re-approving brings them back.
  if (update.status === "suspended" || update.status === "rejected") {
    await Product.updateMany({ vendorId: id, approvalStatus: "approved" }, { $set: { approvalStatus: "suspended" } });
  } else if (update.status === "approved") {
    await Product.updateMany({ vendorId: id, approvalStatus: "suspended" }, { $set: { approvalStatus: "approved" } });
  }

  return NextResponse.json({ success: true, vendor });
}
