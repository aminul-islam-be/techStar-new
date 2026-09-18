import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import { generateProductDetails } from "@/lib/productDetailsAI";

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

    const compareAtPriceRaw =
      body.compareAtPrice === "" ||
      body.compareAtPrice === null ||
      body.compareAtPrice === undefined
        ? undefined
        : Number(body.compareAtPrice);

    const currency = String(body.currency || "BDT")
      .trim()
      .toUpperCase();

    const image = String(body.image || "").trim();

    const featured = Boolean(body.featured);
    const active =
      typeof body.active === "boolean" ? body.active : true;

    // Optional: admin-entered formula/ingredient rows. Only rows with
    // a non-empty name are kept -- everything else is discarded here,
    // not "guessed" by the AI.
    const ingredients = Array.isArray(body.ingredients)
      ? body.ingredients
          .map((ing: any) => ({
            name: String(ing?.name || "").trim(),
            function: String(ing?.function || "").trim(),
            amount: String(ing?.amount || "").trim(),
          }))
          .filter((ing: { name: string }) => ing.name.length > 0)
      : [];

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

    if (
      compareAtPriceRaw !== undefined &&
      (!Number.isFinite(compareAtPriceRaw) ||
        compareAtPriceRaw < 0)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid compare-at price.",
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
      compareAtPrice:
        compareAtPriceRaw !== undefined &&
        compareAtPriceRaw > price
          ? compareAtPriceRaw
          : undefined,
      currency,
      image,
      stock,
      featured,
      active,
    });

    // Automatically create the matching "Product Details" entry
    // (AI generated, or fallback if AI is unavailable). This must
    // never block or fail the product creation itself.
    let productDetailsStatus: "created" | "failed" = "failed";

    try {
      const detail = await generateProductDetails({
        _id: String(product._id),
        name: product.name,
        category: product.category,
        description: product.description,
        price: product.price,
        stock: product.stock,
        ingredients,
      });

      productDetailsStatus = detail ? "created" : "failed";
    } catch (detailError) {
      console.error(
        "Auto product-details generation failed:",
        detailError
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Product added successfully.",
        product,
        productDetailsStatus,
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
