import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ChatConversation from "@/models/ChatConversation";
import Vendor from "@/models/Vendor";
import { getAdminSession } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ success: false, message: "Admin login required." }, { status: 401 });
  }
  await connectDB();

  const filter = new URL(request.url).searchParams.get("filter") || "flagged";
  const query: Record<string, unknown> =
    filter === "flagged"
      ? { $or: [{ violationsVendor: { $gt: 0 } }, { violationsCustomer: { $gt: 0 } }] }
      : filter === "reported"
      ? { reported: true }
      : filter === "locked"
      ? { locked: true }
      : {};

  const convs = await ChatConversation.find(query).sort({ lastMessageAt: -1 }).limit(100).lean();
  const vendors = await Vendor.find({ _id: { $in: convs.map((c) => c.vendorId) } })
    .select("chatViolations status")
    .lean();
  const vmap = new Map(vendors.map((v) => [String(v._id), v]));

  return NextResponse.json({
    success: true,
    conversations: convs.map((c) => ({
      _id: String(c._id),
      customerName: c.customerName,
      vendorId: String(c.vendorId),
      vendorName: c.vendorName,
      vendorStatus: vmap.get(String(c.vendorId))?.status || "",
      vendorTotalViolations: vmap.get(String(c.vendorId))?.chatViolations || 0,
      productName: c.productName || "",
      lastMessageAt: c.lastMessageAt,
      violationsCustomer: c.violationsCustomer,
      violationsVendor: c.violationsVendor,
      locked: c.locked,
      reported: c.reported,
      reportReason: c.reportReason || "",
    })),
  });
}
