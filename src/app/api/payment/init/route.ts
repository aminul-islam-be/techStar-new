import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import { getSessionUserId } from "@/lib/userSession";
import { getBaseUrl, startOrderPayment } from "@/lib/sslcommerz";
import { getSiteSettings } from "@/lib/siteSettings";

/** The logged-in customer starts paying for THEIR OWN unpaid online order. */
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const userId = await getSessionUserId();
    const body = await request.json().catch(() => ({}));
    const orderId = String(body.orderId || "");

    if (!userId) {
      return NextResponse.json({ success: false, message: "Please login to pay for your order." }, { status: 401 });
    }
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return NextResponse.json({ success: false, message: "Order ID is required." }, { status: 400 });
    }

    const order = await Order.findOne({ _id: orderId, userId });
    if (!order) {
      return NextResponse.json({ success: false, message: "Order not found." }, { status: 404 });
    }
    if (order.paymentStatus === "paid") {
      return NextResponse.json({ success: false, message: "This order is already paid." }, { status: 400 });
    }
    if (order.paymentMethod !== "sslcommerz" || order.status !== "pending") {
      return NextResponse.json({ success: false, message: "This order can not be paid online any more." }, { status: 400 });
    }

    // a new transaction id for every attempt; the callbacks find the order by it
    const tranId = `${String(order._id).slice(-10)}${Date.now()}`;
    await Order.updateOne({ _id: order._id }, { $push: { paymentTranIds: tranId } });

    const site = await getSiteSettings();
    const started = await startOrderPayment({
      tranId,
      amount: order.totalAmount,
      baseUrl: getBaseUrl(request),
      name: order.customerName,
      phone: order.customerPhone,
      email: order.customerEmail,
      address: order.deliveryAddress?.address,
      city: order.deliveryAddress?.city,
      productName: `${site.siteName} order`,
    });

    if (started.ok === false) {
      return NextResponse.json({ success: false, message: started.message }, { status: 502 });
    }
    return NextResponse.json({ success: true, gatewayUrl: started.gatewayUrl });
  } catch (error) {
    console.error("Payment init error:", error);
    return NextResponse.json({ success: false, message: "Payment gateway error." }, { status: 500 });
  }
}
