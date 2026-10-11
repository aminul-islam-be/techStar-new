import { getAdminSession } from "@/lib/adminAuth";
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getAdminSession("orders"))) {
    return NextResponse.json({ success: false, message: "Admin login required." }, { status: 401 });
  }
  try {
    await connectDB();

    const { id } = await params;

    const order = await Order.findById(id)
      .populate("userId", "fullName phone email")
      .lean();

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          message: "Order not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("GET admin order by id error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load order.",
      },
      { status: 500 }
    );
  }
}
