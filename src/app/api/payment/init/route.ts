import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ success: false, message: "Order ID is required." }, { status: 400 });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ success: false, message: "Order not found." }, { status: 404 });
    }

    const baseUrl = new URL(request.url).origin;

    const sslPayload = new URLSearchParams({
      store_id: "techs6ab0bf2610602",
      store_passwd: "z70d6RKYVQmW", // আপনার জেনারেট করা পাসওয়ার্ড
      total_amount: order.totalAmount.toString(),
      currency: "BDT",
      tran_id: order._id.toString(),
      success_url: `${baseUrl}/api/payment/success`,
      fail_url: `${baseUrl}/api/payment/fail`,
      cancel_url: `${baseUrl}/api/payment/cancel`,
      ipn_url: `${baseUrl}/api/payment/ipn`,
      cus_name: order.customerName,
      cus_email: order.customerEmail || "customer@ex.com",
      cus_add1: order.deliveryAddress?.address || "Dhaka",
      cus_city: order.deliveryAddress?.city || "Dhaka",
      cus_phone: order.customerPhone,
      shipping_method: "NO",
      product_name: "TechStar Products",
      product_category: "General",
      product_profile: "general",
    });

    const sslResponse = await fetch("https://sandbox.sslcommerz.com/gwprocess/v4/api.php", {
      method: "POST",
      body: sslPayload,
    });

    const sslData = await sslResponse.json();

    if (sslData && sslData.status === "SUCCESS") {
      return NextResponse.json({
        success: true,
        gatewayUrl: sslData.GatewayPageURL,
      });
    } else {
      return NextResponse.json({ success: false, message: "Failed to connect with payment gateway." }, { status: 400 });
    }
  } catch (error) {
    console.error("Payment init error:", error);
    return NextResponse.json({ success: false, message: "Payment gateway error." }, { status: 500 });
  }
}
