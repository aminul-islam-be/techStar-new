import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import Vendor from "@/models/Vendor";
import ChatConversation from "@/models/ChatConversation";
import { getChatCustomer } from "@/lib/chatAuth";
import { postChatMessage } from "@/lib/chat";
import { PLATFORM_NAME } from "@/lib/platform";

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
      title: c.isPlatform ? PLATFORM_NAME : c.vendorName,
      subtitle: c.productName || "",
      lastMessageText: c.lastMessageText,
      lastMessageAt: c.lastMessageAt,
      unread: c.unreadCustomer,
      locked: c.locked,
    })),
  });
}

/**
 * Customer starts (or continues) a chat about a product:
 *  - vendor product  -> chat with that vendor's shop
 *  - TechStar product -> chat with TechStar (the owner / admin)
 */
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
    approvalStatus: { $in: ["approved", null] },
  }).lean();
  if (!product) {
    return NextResponse.json({ success: false, message: "Product not found." }, { status: 404 });
  }

  let conv;

  if (product.vendorId) {
    const vendor = await Vendor.findOne({ _id: product.vendorId, status: "approved" }).select("shopName").lean();
    if (!vendor) {
      return NextResponse.json({ success: false, message: "This seller is not available right now." }, { status: 404 });
    }
    conv = await ChatConversation.findOneAndUpdate(
      { customerId: customer.id, vendorId: vendor._id },
      {
        $setOnInsert: { customerName: customer.firstName, lastMessageAt: new Date() },
        $set: { vendorName: vendor.shopName, productId: product._id, productName: product.name },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
  } else {
    // TechStar's own product: one support chat per customer
    const filter = { customerId: customer.id, isPlatform: true };
    const update = {
      $setOnInsert: { customerName: customer.firstName, lastMessageAt: new Date() },
      $set: { vendorName: PLATFORM_NAME, productId: product._id, productName: product.name },
    };
    try {
      conv = await ChatConversation.findOneAndUpdate(filter, update, {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
      });
    } catch (error) {
      // two first messages at the same moment: the other one created it, just use that
      if ((error as { code?: number }).code !== 11000) throw error;
      conv = await ChatConversation.findOne(filter);
    }
  }

  if (!conv) return NextResponse.json({ success: false, message: "Could not open the chat." }, { status: 500 });

  const result = await postChatMessage(String(conv._id), "customer", body.text);
  if (!result.ok) {
    return NextResponse.json({ success: false, message: result.error, blocked: result.blocked }, { status: result.status });
  }

  return NextResponse.json({ success: true, conversationId: String(conv._id) }, { status: 201 });
}
