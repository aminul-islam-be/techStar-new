import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import StockAlert from "@/models/StockAlert";
import Product from "@/models/Product";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const productId = String(body.productId || "").trim();
    const contact = String(body.contact || "").trim();
    const userId = request.headers.get("x-user-id") || undefined;

    if (!productId) {
      return NextResponse.json(
        { success: false, message: "Product ID is required." },
        { status: 400 }
      );
    }

    if (!contact || contact.length < 5) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid email or phone number." },
        { status: 400 }
      );
    }

    const product = await Product.findById(productId).select("name stock").lean();

    if (!product) {
      return NextResponse.json(
        { success: false, message: "Product not found." },
        { status: 404 }
      );
    }

    await StockAlert.findOneAndUpdate(
      { productId, contact },
      {
        productId,
        productName: product.name,
        contact,
        userId: userId || undefined,
        notified: false,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({
      success: true,
      message: "We'll let you know as soon as it's back in stock.",
    });
  } catch (error) {
    console.error("POST stock-alert error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to save your request." },
      { status: 500 }
    );
  }
}
