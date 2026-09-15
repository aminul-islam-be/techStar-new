import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import ProductDetail from "@/models/ProductDetail";
import { generateProductDetails } from "@/lib/productDetailsAI";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const search = searchParams.get("search");

    const filter: Record<string, any> = {};

    if (productId) {
      filter.productId = productId;
    }

    if (search) {
      filter.productName = {
        $regex: search,
        $options: "i",
      };
    }

    const details = await ProductDetail.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      details,
    });
  } catch (error) {
    console.error("Product details GET error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load product details",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body?.name) {
      return NextResponse.json(
        {
          success: false,
          message: "Product name is required",
        },
        { status: 400 }
      );
    }

    const detail = await generateProductDetails({
      _id: body._id,
      name: body.name,
      category: body.category,
      description: body.description,
      price: body.price,
      stock: body.stock,
    });

    return NextResponse.json({
      success: true,
      detail,
    });
  } catch (error) {
    console.error("Product details POST error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to generate product details",
      },
      { status: 500 }
    );
  }
}
