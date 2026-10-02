import { NextResponse } from "next/server";
import mongoose from "mongoose";
import ChatConversation from "@/models/ChatConversation";
import ChatMessage from "@/models/ChatMessage";
import { getChatCustomer } from "@/lib/chatAuth";
import { postChatMessage } from "@/lib/chat";

type Ctx = { params: Promise<{ id: string }> };

async function load(request: Request, id: string) {
  const customer = await getChatCustomer(request);
  if (!customer) return { error: NextResponse.json({ success: false, message: "Please login.", redirectToLogin: true }, { status: 401 }) };
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { error: NextResponse.json({ success: false, message: "Invalid chat." }, { status: 400 }) };
  }
  // a customer can only open THEIR OWN conversations
  const conv = await ChatConversation.findOne({ _id: id, customerId: customer.id });
  if (!conv) return { error: NextResponse.json({ success: false, message: "Chat not found." }, { status: 404 }) };
  return { customer, conv };
}

export async function GET(request: Request, { params }: Ctx) {
  const { id } = await params;
  const r = await load(request, id);
  if (r.error) return r.error;
  const conv = r.conv!;

  const messages = await ChatMessage.find({ conversationId: conv._id, blocked: { $ne: true } })
    .sort({ createdAt: 1 })
    .limit(300)
    .select("sender text createdAt")
    .lean();

  if (conv.unreadCustomer) await ChatConversation.updateOne({ _id: conv._id }, { $set: { unreadCustomer: 0 } });

  return NextResponse.json({
    success: true,
    conversation: {
      _id: String(conv._id),
      title: conv.vendorName,
      subtitle: conv.productName || "",
      locked: false, // customers can always write; only the seller side gets locked
      platform: Boolean(conv.isPlatform),
      reported: conv.reported,
    },
    messages,
  });
}

export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const r = await load(request, id);
  if (r.error) return r.error;

  const body = await request.json();
  const result = await postChatMessage(id, "customer", body.text);
  if (!result.ok) {
    return NextResponse.json({ success: false, message: result.error, blocked: result.blocked }, { status: result.status });
  }
  return NextResponse.json({ success: true, message: result.message }, { status: 201 });
}
