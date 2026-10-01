import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import ChatConversation from "@/models/ChatConversation";
import ChatMessage from "@/models/ChatMessage";
import { getAdminSession } from "@/lib/adminAuth";

type Ctx = { params: Promise<{ id: string }> };

const noAuth = () => NextResponse.json({ success: false, message: "Admin login required." }, { status: 401 });

/** Admin sees EVERYTHING, including the messages that were blocked. */
export async function GET(_request: NextRequest, { params }: Ctx) {
  if (!(await getAdminSession())) return noAuth();
  await connectDB();

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Invalid chat." }, { status: 400 });
  }

  const messages = await ChatMessage.find({ conversationId: id }).sort({ createdAt: 1 }).limit(500).lean();
  return NextResponse.json({ success: true, messages });
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  if (!(await getAdminSession())) return noAuth();
  await connectDB();

  const { id } = await params;
  const body = await request.json();
  const update: Record<string, unknown> = {};

  if (typeof body.locked === "boolean") update.locked = body.locked;
  if (body.clearReport === true) update.reported = false;
  if (body.resetViolations === true) {
    update.violationsVendor = 0;
    update.violationsCustomer = 0;
  }

  const conv = await ChatConversation.findByIdAndUpdate(id, { $set: update }, { returnDocument: "after" }).lean();
  if (!conv) return NextResponse.json({ success: false, message: "Chat not found." }, { status: 404 });

  return NextResponse.json({ success: true });
}
