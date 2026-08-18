import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search")?.trim() || "";
    const category = searchParams.get("category")?.trim() || "";
    const admin = searchParams.get("admin") === "true";

    const filter: Record<string, unknown> = {};

    // Public users should only see active products.
    // Admin can see active and inactive products.
    if (!admin) {
      filter.active = true;
    }

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
    console.error("Product GET API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load products.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    const id = String(body.id || "").trim();

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Product ID is required.",
        },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) {
      updateData.name = String(body.name).trim();
    }

    if (body.slug !== undefined) {
      updateData.slug = String(body.slug)
        .trim()
        .toLowerCase();
    }

    if (body.category !== undefined) {
      updateData.category = String(body.category).trim();
    }

    if (body.description !== undefined) {
      updateData.description = String(
        body.description
      ).trim();
    }

    if (body.price !== undefined) {
      const price = Number(body.price);

      if (!Number.isFinite(price) || price < 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid price.",
          },
          { status: 400 }
        );
      }

      updateData.price = price;
    }

    if (body.currency !== undefined) {
      updateData.currency = String(body.currency)
        .trim()
        .toUpperCase();
    }

    if (body.image !== undefined) {
      updateData.image = String(body.image).trim();
    }

    if (body.stock !== undefined) {
      const stock = Number(body.stock);

      if (!Number.isFinite(stock) || stock < 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid stock quantity.",
          },
          { status: 400 }
        );
      }

      updateData.stock = stock;
    }

    if (body.featured !== undefined) {
      updateData.featured = Boolean(body.featured);
    }

    if (body.active !== undefined) {
      updateData.active = Boolean(body.active);
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      }
    ).lean();

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
  } catch (error: unknown) {
    console.error("Product PUT API error:", error);

    const mongoError = error as {
      code?: number;
    };

    if (mongoError.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          message: "A product with this slug already exists.",
        },
        { status: 409 }
      );
    }

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
    const id = searchParams.get("id")?.trim() || "";

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
    console.error("Product DELETE API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to delete product.",
      },
      { status: 500 }
    );
  }
}
