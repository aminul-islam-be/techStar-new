import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import Vendor from "@/models/Vendor";
import ChatConversation from "@/models/ChatConversation";
import { getChatCustomer } from "@/lib/chatAuth";
import { postChatMessage } from "@/lib/chat";

const needLogin = () =>
  NextResponse.json({ success: false, message: "Please login to chat with sellers.", redirectToLogin: true }, { status: 401 });

/** Customer inbox */
export async function GET(request: Request) {
  const customer = await getChatCustomer(request);
  if (!customer) return needLogin();

  const convs = await ChatConversation.find({ customerId: customer.id }).sort({ lastMessageAt: -1 }).limit(50).lean();

  return NextResponse.json({
    success: true,
    conversations: convs.map((c) => ({
      _id: String(c._id),
      title: c.vendorName,
      subtitle: c.productName || "",
      lastMessageText: c.lastMessageText,
      lastMessageAt: c.lastMessageAt,
      unread: c.unreadCustomer,
      locked: c.locked,
    })),
  });
}

/** Customer starts (or continues) a chat with the seller of a product. */
export async function POST(request: Request) {
  const customer = await getChatCustomer(request);
  if (!customer) return needLogin();

  const body = await request.json();
  const productId = String(body.productId || "");
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return NextResponse.json({ success: false, message: "Invalid product." }, { status: 400 });
  }

  await connectDB();
  const product = await Product.findOne({
    _id: productId,
    active: true,
    vendorId: { $exists: true, $ne: null },
    approvalStatus: { $in: ["approved", null] },
  }).lean();
  if (!product) {
    return NextResponse.json({ success: false, message: "This product has no seller to chat with." }, { status: 404 });
  }

  const vendor = await Vendor.findOne({ _id: product.vendorId, status: "approved" }).select("shopName").lean();
  if (!vendor) {
    return NextResponse.json({ success: false, message: "This seller is not available right now." }, { status: 404 });
  }

  const conv = await ChatConversation.findOneAndUpdate(
    { customerId: customer.id, vendorId: vendor._id },
    {
      $setOnInsert: { customerName: customer.firstName, lastMessageAt: new Date() },
      $set: { vendorName: vendor.shopName, productId: product._id, productName: product.name },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  const result = await postChatMessage(String(conv._id), "customer", body.text);
  if (!result.ok) {
    return NextResponse.json({ success: false, message: result.error, blocked: result.blocked }, { status: result.status });
  }

  return NextResponse.json({ success: true, conversationId: String(conv._id) }, { status: 201 });
}
