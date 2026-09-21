import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const formData = await request.formData();
    const tran_id = formData.get("tran_id");

    if (tran_id) {
      await Order.findByIdAndUpdate(tran_id, { paymentStatus: "paid" });
    }
    
    // পেমেন্ট সফল হলে ইউজারকে অর্ডার পেজে পাঠিয়ে দেবে
    const baseUrl = new URL(request.url).origin;
    return NextResponse.redirect(`${baseUrl}/orders?payment=success`, 303);
  } catch (error) {
    console.error("Payment Success Error:", error);
    return NextResponse.redirect(new URL("/orders", request.url).toString(), 303);
  }
}
