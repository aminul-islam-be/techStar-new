import { NextResponse } from "next/server";
import mongoose from "mongoose";
import ChatConversation from "@/models/ChatConversation";
import ChatMessage from "@/models/ChatMessage";
import { getCurrentVendor, unauthorized } from "@/lib/vendorAuth";
import { postChatMessage } from "@/lib/chat";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const vendor = await getCurrentVendor();
  if (!vendor) return unauthorized();

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Invalid chat." }, { status: 400 });
  }

  // a vendor can only open conversations that belong to their own shop
  const conv = await ChatConversation.findOne({ _id: id, vendorId: vendor._id });
  if (!conv) return NextResponse.json({ success: false, message: "Chat not found." }, { status: 404 });

  const messages = await ChatMessage.find({ conversationId: conv._id, blocked: { $ne: true } })
    .sort({ createdAt: 1 })
    .limit(300)
    .select("sender text createdAt")
    .lean();

  if (conv.unreadVendor) await ChatConversation.updateOne({ _id: conv._id }, { $set: { unreadVendor: 0 } });

  return NextResponse.json({
    success: true,
    conversation: {
      _id: String(conv._id),
      title: conv.customerName,
      subtitle: conv.productName || "",
      locked: conv.locked,
      reported: false,
    },
    messages,
  });
}

/** Vendors can only REPLY. A chat is always started by the customer. */
export async function POST(request: Request, { params }: Ctx) {
  const vendor = await getCurrentVendor({ requireApproved: true });
  if (!vendor) return unauthorized("Your shop must be approved to reply.");

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Invalid chat." }, { status: 400 });
  }
  if (!(await ChatConversation.exists({ _id: id, vendorId: vendor._id }))) {
    return NextResponse.json({ success: false, message: "Chat not found." }, { status: 404 });
  }

  const body = await request.json();
  const result = await postChatMessage(id, "vendor", body.text);
  if (!result.ok) {
    return NextResponse.json(
      { success: false, message: result.error, blocked: result.blocked, locked: result.locked },
      { status: result.status }
    );
  }
  return NextResponse.json({ success: true, message: result.message }, { status: 201 });
}
