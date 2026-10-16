import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { getSessionUserId } from "@/lib/userSession";
import { cleanSearchQuery, searchClauses } from "@/lib/searchTerms";
import History from "@/models/History";
import Product from "@/models/Product";

// same rule as GET /api/products: only live, approved products
const LIVE_PRODUCTS = {
  active: true,
  approvalStatus: { $in: ["approved", null] },
};

const MAX_PRODUCTS = 6;
const MAX_TERMS = 5;

// Keeps the first spelling of each text (capitals ignored), up to `limit` items.
function uniqueTexts(values: unknown[], limit: number): string[] {
  const seen = new Map<string, string>();

  for (const value of values) {
    const text = String(value ?? "").replace(/\s+/g, " ").trim();

    if (text && !seen.has(text.toLowerCase())) {
      seen.set(text.toLowerCase(), text);
    }
  }

  return Array.from(seen.values()).slice(0, limit);
}

// GET /api/products/suggest?q=jota
// Returns matching products, brand and category words, and the signed-in
// customer's recent searches (the user comes from the signed cookie).
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const query = cleanSearchQuery(new URL(request.url).searchParams.get("q"));
    const userId = await getSessionUserId();

    let recent: string[] = [];

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      const searches: { query?: string }[] = await History.find({
        userId: new mongoose.Types.ObjectId(userId),
        type: "search",
      })
        .sort({ at: -1 })
        .limit(30)
        .select("query")
        .lean();

      recent = uniqueTexts(
        searches
          .map((search) => search.query || "")
          .filter(
            (text) => !query || text.toLowerCase().includes(query.toLowerCase())
          ),
        MAX_TERMS
      );
    }

    const clauses = searchClauses(query);

    if (clauses.length === 0) {
      return NextResponse.json({ success: true, products: [], terms: [], recent });
    }

    const filter: Record<string, unknown> = { ...LIVE_PRODUCTS, $and: clauses };

    const [products, brands, categories] = await Promise.all([
      Product.find(filter)
        .sort({ featured: -1, createdAt: -1 })
        .limit(MAX_PRODUCTS)
        .select("name slug image price currency")
        .lean(),
      Product.distinct("brand", filter),
      Product.distinct("category", filter),
    ]);

    return NextResponse.json({
      success: true,
      products: products.map((product) => ({
        ...product,
        _id: String(product._id),
      })),
      terms: uniqueTexts([...brands, ...categories], MAX_TERMS),
      recent,
    });
  } catch (error) {
    console.error("GET product suggestions error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to load suggestions." },
      { status: 500 }
    );
  }
}
