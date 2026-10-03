import { NextResponse } from "next/server";
import mongoose from "mongoose";
import ChatConversation from "@/models/ChatConversation";
import { getChatCustomer } from "@/lib/chatAuth";

type Ctx = { params: Promise<{ id: string }> };

/** Customer reports a seller (e.g. "asked me to order outside TechStar"). */
export async function POST(request: Request, { params }: Ctx) {
  const customer = await getChatCustomer(request);
  if (!customer) return NextResponse.json({ success: false, message: "Please login." }, { status: 401 });

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Invalid chat." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const reason = String(body.reason || "").trim().slice(0, 300) || "Reported by customer";

  const conv = await ChatConversation.findOneAndUpdate(
    { _id: id, customerId: customer.id },
    { $set: { reported: true, reportReason: reason, reportedAt: new Date() } }
  );
  if (!conv) return NextResponse.json({ success: false, message: "Chat not found." }, { status: 404 });

  return NextResponse.json({ success: true, message: "Thank you. Our support team will review this chat." });
}
