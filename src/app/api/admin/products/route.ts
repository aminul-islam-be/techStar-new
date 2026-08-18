import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    const name = String(body.name || "").trim();
    const slug = String(body.slug || "").trim().toLowerCase();
    const category = String(body.category || "").trim();
    const description = String(body.description || "").trim();

    const price = Number(body.price);
    const stock = Number(body.stock);

    const currency = String(body.currency || "BDT")
      .trim()
      .toUpperCase();

    const image = String(body.image || "").trim();

    const featured = Boolean(body.featured);
    const active =
      typeof body.active === "boolean" ? body.active : true;

    if (!name || !slug || !category) {
      return NextResponse.json(
        {
          success: false,
          message: "Name, slug and category are required.",
        },
        { status: 400 }
      );
    }

    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid price.",
        },
        { status: 400 }
      );
    }

    if (!Number.isFinite(stock) || stock < 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid stock quantity.",
        },
        { status: 400 }
      );
    }

    const existingProduct = await Product.findOne({ slug });

    if (existingProduct) {
      return NextResponse.json(
        {
          success: false,
          message: "A product with this slug already exists.",
        },
        { status: 409 }
      );
    }

    const product = await Product.create({
      name,
      slug,
      category,
      description,
      price,
      currency,
      image,
      stock,
      featured,
      active,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Product added successfully.",
        product,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Add product API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to add product.",
      },
      { status: 500 }
    );
  }
}
