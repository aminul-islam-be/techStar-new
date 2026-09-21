import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import mongoose from "mongoose";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { userId, customerName, customerPhone, customerEmail, items, totalAmount, deliveryAddress } = body;

    if (!userId || !customerName || !customerPhone || !items || items.length === 0 || !totalAmount || !deliveryAddress) {
      return NextResponse.json({ success: false, message: "Missing required order fields." }, { status: 400 });
    }

    const orderItems = items.map((item: any) => ({
      productId: new mongoose.Types.ObjectId(item.productId),
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image: item.image || "",
    }));

    // প্রথমে অর্ডারটি pending পেমেন্ট স্ট্যাটাসে ডাটাবেজে সেভ হবে
    const newOrder = await Order.create({
      userId: new mongoose.Types.ObjectId(userId),
      customerName,
      customerPhone,
      customerEmail: customerEmail || "",
      items: orderItems,
      totalAmount,
      currency: "BDT",
      paymentMethod: "sslcommerz",
      paymentStatus: "pending",
      status: "pending",
      deliveryAddress,
    });

    const orderId = newOrder._id.toString();

    return NextResponse.json({
      success: true,
      message: "Order created successfully. Proceed to payment.",
      orderId: orderId,
    });
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json({ success: false, message: "Server error while creating order." }, { status: 500 });
  }
}
