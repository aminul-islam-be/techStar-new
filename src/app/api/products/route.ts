import { getAdminSession } from "@/lib/adminAuth";
import { NextRequest, NextResponse } from "next/server";
import { notifyBackInStock } from "@/lib/notify";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import { cleanBrand, cleanSku, skuTaken } from "@/lib/productFields";
import { cleanSearchQuery, searchClauses } from "@/lib/searchTerms";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = cleanSearchQuery(searchParams.get("search"));
    const category = searchParams.get("category")?.trim() || "";

    const filter: Record<string, unknown> = {
      active: true,
      // hide vendor products that are pending / rejected / suspended
      // (admin products and old products have no value, which counts as approved)
      approvalStatus: { $in: ["approved", null] },
    };

    if (category) {
      filter.category = category;
    }

    if (search) {
      // "tshirt", "t shirt", "jota" and "জুতা" find the same products (see lib/searchTerms.ts)
      filter.$and = searchClauses(search);
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
  if (!(await getAdminSession())) {
    return NextResponse.json({ success: false, message: "Admin login required." }, { status: 401 });
  }
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
      "images",
      "stock",
      "featured",
      "active",
      "brand",
      "sku",
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

    if ("brand" in cleanUpdates) {
      cleanUpdates.brand = cleanBrand(cleanUpdates.brand);
    }

    if ("sku" in cleanUpdates) {
      const sku = cleanSku(cleanUpdates.sku);
      if (sku.error) {
        return NextResponse.json({ success: false, message: sku.error }, { status: 400 });
      }
      if (await skuTaken(sku.sku, id)) {
        return NextResponse.json({ success: false, message: "This SKU is already used by another product." }, { status: 409 });
      }
      cleanUpdates.sku = sku.sku;
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

    // product is available again: tell customers who pressed "notify me"
    if ("stock" in cleanUpdates && Number(product.stock) > 0) {
      await notifyBackInStock(product._id);
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
  if (!(await getAdminSession())) {
    return NextResponse.json({ success: false, message: "Admin login required." }, { status: 401 });
  }
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

