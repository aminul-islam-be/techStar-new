import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const formData = await request.formData();
    const tran_id = formData.get("tran_id");

    if (tran_id) {
      await Order.findByIdAndUpdate(tran_id, { 
        paymentStatus: "failed", 
        status: "cancelled" 
      });
    }
    
    // পেমেন্ট ফেইল হলে অর্ডার পেজেই ফেইল মেসেজ দেখাবে
    const baseUrl = new URL(request.url).origin;
    return NextResponse.redirect(`${baseUrl}/orders?payment=failed`, 303);
  } catch (error) {
    return NextResponse.redirect(new URL("/orders", request.url).toString(), 303);
  }
}
