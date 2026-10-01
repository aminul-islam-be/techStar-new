import { NextResponse } from "next/server";
import ChatConversation from "@/models/ChatConversation";
import { getCurrentVendor, unauthorized } from "@/lib/vendorAuth";

export async function GET() {
  const vendor = await getCurrentVendor();
  if (!vendor) return unauthorized();

  const convs = await ChatConversation.find({ vendorId: vendor._id }).sort({ lastMessageAt: -1 }).limit(100).lean();

  return NextResponse.json({
    success: true,
    conversations: convs.map((c) => ({
      _id: String(c._id),
      title: c.customerName, // first name only, no contact details
      subtitle: c.productName || "",
      lastMessageText: c.lastMessageText,
      lastMessageAt: c.lastMessageAt,
      unread: c.unreadVendor,
      locked: c.locked,
    })),
  });
}
