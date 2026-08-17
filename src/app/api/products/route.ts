import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import User from "@/models/User";

function getSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("AUTH_SECRET is not configured.");
  }

  return new TextEncoder().encode(secret);
}

async function verifyAdmin(request: NextRequest) {
  try {
    const token = request.cookies.get("admin_token")?.value;

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, getSecret());

    if (payload.role !== "admin" || !payload.userId) {
      return null;
    }

    const user = await User.findById(payload.userId)
      .select("_id role active")
      .lean();

    if (!user || user.role !== "admin" || user.active !== true) {
      return null;
    }

    return user;
  } catch (error) {
    console.error("Admin verification error:", error);
    return null;
  }
}

function createSlug(value: string) {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/*
|--------------------------------------------------------------------------
| GET PRODUCTS
|--------------------------------------------------------------------------
| Public:
|   /api/products
|   -> only active products
|
| Admin:
|   /api/products?admin=true
|   -> all products
|--------------------------------------------------------------------------
*/

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search")?.trim() || "";
    const category = searchParams.get("category")?.trim() || "";
    const adminMode = searchParams.get("admin") === "true";

    const filter: Record<string, unknown> = {};

    if (!adminMode) {
      filter.active = true;
    } else {
      const admin = await verifyAdmin(request);

      if (!admin) {
        return NextResponse.json(
          {
            success: false,
            message: "Unauthorized. Admin access required.",
          },
          { status: 401 }
        );
      }
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

/*
|--------------------------------------------------------------------------
| POST PRODUCT
|--------------------------------------------------------------------------
*/

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized. Admin access required.",
        },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();

    const name = String(body.name || "").trim();
    const category = String(body.category || "").trim();
    const description = String(body.description || "").trim();

    const price = Number(body.price);
    const stock = Number(body.stock ?? 0);

    const currency = String(body.currency || "USD")
      .trim()
      .toUpperCase();

    const image = String(body.image || "").trim();

    const featured = Boolean(body.featured);
    const active =
      typeof body.active === "boolean" ? body.active : true;

    let slug = String(body.slug || "").trim();

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Product name is required.",
        },
        { status: 400 }
      );
    }

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          message: "Product category is required.",
        },
        { status: 400 }
      );
    }

    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid product price is required.",
        },
        { status: 400 }
      );
    }

    if (!Number.isFinite(stock) || stock < 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid stock quantity is required.",
        },
        { status: 400 }
      );
    }

    if (!slug) {
      slug = createSlug(name);
    } else {
      slug = createSlug(slug);
    }

    if (!slug) {
      return NextResponse.json(
        {
          success: false,
          message: "Unable to create product slug.",
        },
        { status: 400 }
      );
    }

    const existingProduct = await Product.findOne({
      slug,
    }).lean();

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
        message: "Product created successfully.",
        product,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Product POST API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to create product.",
      },
      { status: 500 }
    );
  }
}

/*
|--------------------------------------------------------------------------
| PATCH PRODUCT
|--------------------------------------------------------------------------
*/

export async function PATCH(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized. Admin access required.",
        },
        { status: 401 }
      );
    }

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

    const product = await Product.findById(id);

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message: "Product not found.",
        },
        { status: 404 }
      );
    }

    if (body.name !== undefined) {
      const name = String(body.name).trim();

      if (!name) {
        return NextResponse.json(
          {
            success: false,
            message: "Product name cannot be empty.",
          },
          { status: 400 }
        );
      }

      product.name = name;
    }

    if (body.category !== undefined) {
      const category = String(body.category).trim();

      if (!category) {
        return NextResponse.json(
          {
            success: false,
            message: "Product category cannot be empty.",
          },
          { status: 400 }
        );
      }

      product.category = category;
    }

    if (body.description !== undefined) {
      product.description = String(body.description).trim();
    }

    if (body.price !== undefined) {
      const price = Number(body.price);

      if (!Number.isFinite(price) || price < 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid product price.",
          },
          { status: 400 }
        );
      }

      product.price = price;
    }

    if (body.currency !== undefined) {
      product.currency = String(body.currency)
        .trim()
        .toUpperCase();
    }

    if (body.image !== undefined) {
      product.image = String(body.image).trim();
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

      product.stock = stock;
    }

    if (body.featured !== undefined) {
      product.featured = Boolean(body.featured);
    }

    if (body.active !== undefined) {
      product.active = Boolean(body.active);
    }

    if (body.slug !== undefined) {
      const newSlug = createSlug(String(body.slug));

      if (!newSlug) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid slug.",
          },
          { status: 400 }
        );
      }

      const existingProduct = await Product.findOne({
        slug: newSlug,
        _id: { $ne: id },
      }).lean();

      if (existingProduct) {
        return NextResponse.json(
          {
            success: false,
            message: "Another product already uses this slug.",
          },
          { status: 409 }
        );
      }

      product.slug = newSlug;
    }

    await product.save();

    return NextResponse.json({
      success: true,
      message: "Product updated successfully.",
      product,
    });
  } catch (error) {
    console.error("Product PATCH API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to update product.",
      },
      { status: 500 }
    );
  }
}

/*
|--------------------------------------------------------------------------
| DELETE PRODUCT
|--------------------------------------------------------------------------
*/

export async function DELETE(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized. Admin access required.",
        },
        { status: 401 }
      );
    }

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

    const product = await Product.findById(id);

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message: "Product not found.",
        },
        { status: 404 }
      );
    }

    await Product.findByIdAndDelete(id);

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
