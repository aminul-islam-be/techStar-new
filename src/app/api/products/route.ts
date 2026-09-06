import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const category = searchParams.get("category")?.trim() || "";

    const filter: Record<string, unknown> = {
      active: true,
    };

    if (category) {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      products,
    });
  } catch (error) {
    console.error("GET products error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load products.",
      },
      { status: 500 }
    );
  }
}
export async function PATCH(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Product ID is required.",
        },
        { status: 400 }
      );
    }

    const allowedFields = [
      "name",
      "slug",
      "category",
      "description",
      "price",
      "compareAtPrice",
      "currency",
      "image",
      "stock",
      "featured",
      "active",
    ];

    const cleanUpdates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (field in updates) {
        cleanUpdates[field] = updates[field];
      }
    }

    if ("stock" in cleanUpdates) {
      const stock = Number(cleanUpdates.stock);

      if (!Number.isFinite(stock) || stock < 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid stock value.",
          },
          { status: 400 }
        );
      }

      cleanUpdates.stock = stock;
    }

    if ("compareAtPrice" in cleanUpdates) {
      const raw = cleanUpdates.compareAtPrice;

      if (raw === "" || raw === null || raw === undefined) {
        cleanUpdates.compareAtPrice = undefined;
      } else {
        const compareAtPrice = Number(raw);

        if (!Number.isFinite(compareAtPrice) || compareAtPrice < 0) {
          return NextResponse.json(
            {
              success: false,
              message: "Invalid compare-at price.",
            },
            { status: 400 }
          );
        }

        cleanUpdates.compareAtPrice = compareAtPrice;
      }
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { $set: cleanUpdates },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message: "Product not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Product updated successfully.",
      product,
    });
  } catch (error) {
    console.error("PATCH products error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to update product.",
      },
      { status: 500 }
    );
  }
}
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Product ID is required.",
        },
        { status: 400 }
      );
    }

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message: "Product not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Product deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE products error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to delete product.",
      },
      { status: 500 }
    );
  }
}

