import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Header থেকে ইউজার আইডি বের করা
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json({ success: false, message: "Please login to view your orders." }, { status: 401 });
    }

    // ইউজারের সব অর্ডার ডাটাবেজ থেকে খুঁজে বের করা (নতুন অর্ডার আগে দেখানোর জন্য createdAt: -1)
    const orders = await Order.find({ userId }).sort({ createdAt: -1 });
    
    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error("GET orders error:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const userId = request.headers.get("x-user-id");
    const body = await request.json();

    const orderUserId = userId || body.userId;
    
    if (!orderUserId) {
      return NextResponse.json({ success: false, message: "Unauthorized", redirectToLogin: true }, { status: 401 });
    }

    const newOrder = await Order.create({
      ...body,
      userId: orderUserId,
      status: "Pending",
      paymentStatus: body.paymentMethod === "sslcommerz" ? "Unpaid" : "Pending"
    });

    return NextResponse.json({ 
      success: true, 
      message: "Order placed successfully",
      orderId: newOrder._id
    });
  } catch (error) {
    console.error("POST orders error:", error);
    return NextResponse.json({ success: false, message: "Failed to place order" }, { status: 500 });
  }
}
