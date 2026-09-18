#!/usr/bin/env python3
import json, os

ROOT = os.getcwd()

PATCHES = json.loads(r'''[{"file": "src/components/SideMenu.tsx", "old": "    { icon: \"⊞\", label: t(\"menu.categories\"), href: \"/categories\" },\n    { icon: \"🛒\", label: t(\"menu.cart\"), href: \"/cart\" },", "new": "    { icon: \"⊞\", label: t(\"menu.categories\"), href: \"/categories\" },\n    { icon: \"🧪\", label: t(\"menu.productDetails\"), href: \"/product-details\" },\n    { icon: \"🛒\", label: t(\"menu.cart\"), href: \"/cart\" },"}, {"file": "src/lib/i18n.ts", "old": "    \"menu.categories\": \"Categories\",", "new": "    \"menu.categories\": \"Categories\",\n    \"menu.productDetails\": \"Product Details\","}, {"file": "src/lib/i18n.ts", "old": "    \"menu.categories\": \"ক্যাটাগরি\",", "new": "    \"menu.categories\": \"ক্যাটাগরি\",\n    \"menu.productDetails\": \"প্রোডাক্ট ডিটেইলস\","}, {"file": "src/app/api/admin/products/route.ts", "old": "import { NextRequest, NextResponse } from \"next/server\";\nimport connectDB from \"@/lib/mongodb\";\nimport Product from \"@/models/Product\";", "new": "import { NextRequest, NextResponse } from \"next/server\";\nimport connectDB from \"@/lib/mongodb\";\nimport Product from \"@/models/Product\";\nimport { generateProductDetails } from \"@/lib/productDetailsAI\";"}, {"file": "src/app/api/admin/products/route.ts", "old": "    return NextResponse.json(\n      {\n        success: true,\n        message: \"Product added successfully.\",\n        product,\n      },\n      { status: 201 }\n    );\n  } catch (error) {\n    console.error(\"Add product API error:\", error);", "new": "    // Automatically create the matching \"Product Details\" entry\n    // (AI generated, or fallback if AI is unavailable). This must\n    // never block or fail the product creation itself.\n    let productDetailsStatus: \"created\" | \"failed\" = \"failed\";\n\n    try {\n      const detail = await generateProductDetails({\n        _id: String(product._id),\n        name: product.name,\n        category: product.category,\n        description: product.description,\n        price: product.price,\n        stock: product.stock,\n      });\n\n      productDetailsStatus = detail ? \"created\" : \"failed\";\n    } catch (detailError) {\n      console.error(\n        \"Auto product-details generation failed:\",\n        detailError\n      );\n    }\n\n    return NextResponse.json(\n      {\n        success: true,\n        message: \"Product added successfully.\",\n        product,\n        productDetailsStatus,\n      },\n      { status: 201 }\n    );\n  } catch (error) {\n    console.error(\"Add product API error:\", error);"}, {"file": "src/app/admin/products/add/page.tsx", "old": "      setMessage(\"Product added successfully.\");\n\n      setTimeout(() => {\n        router.push(\"/admin/products\");\n        router.refresh();\n      }, 800);", "new": "      setMessage(\n        data.productDetailsStatus === \"created\"\n          ? \"Product added successfully. Product Details generated automatically.\"\n          : \"Product added successfully. (Product Details could not be auto-generated — you can regenerate it from the Product Details page.)\"\n      );\n\n      setTimeout(() => {\n        router.push(\"/admin/products\");\n        router.refresh();\n      }, 1000);"}, {"file": "src/app/admin/products/page.tsx", "old": "                    <button\n                      onClick={() => toggleFeatured(product)}\n                      style={buttonStyle}\n                    >\n                      {product.featured\n                        ? \"★ Unfeature\"\n                        : \"☆ Feature\"}\n                    </button>\n                  </div>", "new": "                    <button\n                      onClick={() => toggleFeatured(product)}\n                      style={buttonStyle}\n                    >\n                      {product.featured\n                        ? \"★ Unfeature\"\n                        : \"☆ Feature\"}\n                    </button>\n\n                    <Link\n                      href={`/product-details?productId=${product._id}`}\n                      style={{\n                        ...buttonStyle,\n                        display: \"flex\",\n                        alignItems: \"center\",\n                        justifyContent: \"center\",\n                        textDecoration: \"none\",\n                      }}\n                    >\n                      🧪 Details\n                    </Link>\n                  </div>"}, {"file": "src/app/products/[slug]/page.tsx", "old": "            <div className=\"mt-6 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 text-sm\">\n              <span className=\"font-bold text-slate-700\">\n                SKU:\n              </span>\n              <span className=\"text-slate-500\">{sku}</span>", "new": "            <div className=\"mt-4\">\n              <Link\n                href={`/product-details?productId=${product._id}`}\n                className=\"inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-bold text-orange-700 hover:bg-orange-100\"\n              >\n                🧪 View Full Product Details (Ingredients & Formula)\n              </Link>\n            </div>\n\n            <div className=\"mt-6 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 text-sm\">\n              <span className=\"font-bold text-slate-700\">\n                SKU:\n              </span>\n              <span className=\"text-slate-500\">{sku}</span>"}, {"file": "src/app/product-details/page.tsx", "old": "\"use client\";\n\nimport { useEffect, useMemo, useState } from \"react\";", "new": "\"use client\";\n\nimport { Suspense, useEffect, useMemo, useState } from \"react\";\nimport Link from \"next/link\";\nimport { useSearchParams } from \"next/navigation\";"}, {"file": "src/app/product-details/page.tsx", "old": "export default function ProductDetailsPage() {\n  const [details, setDetails] = useState<ProductDetail[]>([]);\n  const [loading, setLoading] = useState(true);\n  const [search, setSearch] = useState(\"\");\n  const [category, setCategory] = useState(\"All\");\n  const [openId, setOpenId] = useState<string | null>(null);\n\n  useEffect(() => {\n    loadDetails();\n  }, []);\n\n  async function loadDetails() {\n    try {\n      setLoading(true);\n\n      const response = await fetch(\"/api/product-details\", {\n        cache: \"no-store\",\n      });\n\n      const data = await response.json();\n\n      if (data.success) {\n        setDetails(data.details || []);\n      }\n    } catch (error) {\n      console.error(\"Failed to load product details:\", error);\n    } finally {\n      setLoading(false);\n    }\n  }", "new": "export default function ProductDetailsPage() {\n  return (\n    <Suspense fallback={<ProductDetailsLoadingFallback />}>\n      <ProductDetailsContent />\n    </Suspense>\n  );\n}\n\nfunction ProductDetailsLoadingFallback() {\n  return (\n    <main className=\"min-h-screen bg-slate-50 text-slate-900\">\n      <div className=\"mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8\">\n        <div className=\"rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm\">\n          <div className=\"mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600\" />\n          <p className=\"text-sm text-slate-500\">\n            Loading product details...\n          </p>\n        </div>\n      </div>\n    </main>\n  );\n}\n\nfunction ProductDetailsContent() {\n  const searchParams = useSearchParams();\n  const productId = searchParams.get(\"productId\");\n\n  const [details, setDetails] = useState<ProductDetail[]>([]);\n  const [loading, setLoading] = useState(true);\n  const [search, setSearch] = useState(\"\");\n  const [category, setCategory] = useState(\"All\");\n  const [openId, setOpenId] = useState<string | null>(null);\n\n  useEffect(() => {\n    loadDetails(productId);\n    // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, [productId]);\n\n  async function loadDetails(forProductId: string | null) {\n    try {\n      setLoading(true);\n\n      const url = forProductId\n        ? `/api/product-details?productId=${encodeURIComponent(\n            forProductId\n          )}`\n        : \"/api/product-details\";\n\n      const response = await fetch(url, {\n        cache: \"no-store\",\n      });\n\n      const data = await response.json();\n\n      if (data.success) {\n        const list: ProductDetail[] = data.details || [];\n        setDetails(list);\n\n        // Deep-linked from a product page: jump straight to that\n        // product's details instead of leaving every card collapsed.\n        if (forProductId && list.length > 0) {\n          setOpenId(list[0]._id);\n        }\n      }\n    } catch (error) {\n      console.error(\"Failed to load product details:\", error);\n    } finally {\n      setLoading(false);\n    }\n  }"}, {"file": "src/app/product-details/page.tsx", "old": "        {/* Search + Filter */}\n        <section className=\"mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm\">", "new": "        {/* Deep link banner */}\n        {productId && (\n          <div className=\"mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800\">\n            <span>Showing details for this product only.</span>\n            <Link\n              href=\"/product-details\"\n              className=\"font-semibold text-indigo-700 underline hover:text-indigo-900\"\n            >\n              View all Product Details →\n            </Link>\n          </div>\n        )}\n\n        {/* Search + Filter */}\n        <section className=\"mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm\">"}]''')

TEST_SCRIPT = r'''/**
 * Product Details — end-to-end verification script
 * ---------------------------------------------------
 * এটা যাচাই করে:
 *   1) Admin থেকে নতুন Product add করলে Product Details automatically তৈরি হয় কি না
 *   2) Ingredient/formula তথ্য না দিলে "Not provided" দেখায় কি না (AI যেন হ্যালুসিনেট না করে)
 *   3) `/api/product-details?productId=...` দিয়ে সেই product-এর details পাওয়া যায় কি না
 *   4) AI unavailable থাকলে source: "fallback" ঠিকমতো কাজ করে কি না
 *
 * ব্যবহার:
 *   1) অন্য টার্মিনালে dev server চালু রাখুন:  npm run dev
 *   2) এই স্ক্রিপ্টটি চালান:                    node scripts/test-product-details.mjs
 *
 *   কোনো ভিন্ন সার্ভার/পোর্টে টেস্ট করতে চাইলে:
 *   BASE_URL=http://localhost:3000 node scripts/test-product-details.mjs
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

let passed = 0;
let failed = 0;

function ok(label) {
  passed += 1;
  console.log(`✅ PASS — ${label}`);
}

function bad(label, detail) {
  failed += 1;
  console.log(`❌ FAIL — ${label}`);
  if (detail !== undefined) {
    console.log(`   ↳ ${detail}`);
  }
}

function uniqueSlug(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

async function createTestProduct({ name, category, description }) {
  const slug = uniqueSlug("test-product-details");

  const response = await fetch(`${BASE_URL}/api/admin/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      slug,
      category,
      description: description || "",
      price: 100,
      stock: 5,
      currency: "BDT",
      image: "",
      featured: false,
      // Kept inactive so this test product never shows up to real
      // customers on the storefront.
      active: false,
    }),
  });

  const data = await response.json().catch(() => ({}));

  return { response, data, slug };
}

async function fetchDetailsForProduct(productId) {
  const response = await fetch(
    `${BASE_URL}/api/product-details?productId=${encodeURIComponent(
      productId
    )}`,
    { cache: "no-store" }
  );

  const data = await response.json().catch(() => ({}));

  return { response, data };
}

async function main() {
  console.log("──────────────────────────────────────────────");
  console.log("🧪 Product Details — End-to-End Test");
  console.log(`   Target: ${BASE_URL}`);
  console.log("──────────────────────────────────────────────\n");

  // ── Test 1: Add a product WITHOUT any ingredient/formula info ──
  console.log("Test 1: Admin Add Product → Auto Product Details\n");

  const test1 = await createTestProduct({
    name: "[TEST] No Formula Sample Cream",
    category: "Skincare",
    description:
      "A moisturizing face cream for daily use. No formula data supplied.",
  });

  if (!test1.response.ok || !test1.data.success) {
    bad(
      "Admin Add Product API returned success",
      JSON.stringify(test1.data)
    );
    console.log(
      "\nবাকি টেস্টগুলো চালানো সম্ভব নয় কারণ প্রোডাক্ট তৈরি হয়নি।"
    );
    printSummary();
    return;
  }

  ok("Admin Add Product API returned success");

  const productId = test1.data.product?._id;

  if (!productId) {
    bad("Response includes the new product's _id");
  } else {
    ok("Response includes the new product's _id");
  }

  if (test1.data.productDetailsStatus === "created") {
    ok('Response reports productDetailsStatus: "created"');
  } else {
    bad(
      'Response reports productDetailsStatus: "created"',
      `Got: ${test1.data.productDetailsStatus}`
    );
  }

  // ── Test 2: Fetch the auto-generated details for that product ──
  console.log("\nTest 2: Product ↔ Details linking (productId)\n");

  if (productId) {
    const { response, data } = await fetchDetailsForProduct(productId);

    if (response.ok && data.success && Array.isArray(data.details)) {
      ok("GET /api/product-details?productId=... responded successfully");

      const detail = data.details[0];

      if (data.details.length === 1 && detail) {
        ok("Exactly one Product Details entry linked to this product");
      } else {
        bad(
          "Exactly one Product Details entry linked to this product",
          `Found: ${data.details.length}`
        );
      }

      if (detail) {
        // ── Test 3: no chemical hallucination ──
        console.log(
          "\nTest 3: Ingredients not supplied → must show 'Not provided'\n"
        );

        const ingredients = detail.ingredients || [];
        const allSayNotProvided =
          ingredients.length > 0 &&
          ingredients.every(
            (ing) =>
              (ing.function || "").trim().toLowerCase() ===
                "not provided" ||
              (ing.amount || "").trim().toLowerCase() === "not provided"
          );

        if (allSayNotProvided) {
          ok(
            "No invented chemical amounts — ingredient rows show 'Not provided'"
          );
        } else {
          bad(
            "No invented chemical amounts — ingredient rows show 'Not provided'",
            `ingredients: ${JSON.stringify(ingredients)}`
          );
        }

        // ── Test 4: descriptive fields are still populated ──
        console.log(
          "\nTest 4: Descriptive (non-chemical) fields are populated\n"
        );

        const descriptiveOk =
          !!detail.purpose &&
          !!detail.howToUse &&
          !!detail.suitableFor &&
          !!detail.safety &&
          !!detail.storage &&
          Array.isArray(detail.benefits);

        if (descriptiveOk) {
          ok(
            "purpose / howToUse / suitableFor / safety / storage / benefits present"
          );
        } else {
          bad(
            "purpose / howToUse / suitableFor / safety / storage / benefits present",
            JSON.stringify(detail)
          );
        }

        // ── Test 5: source is either "ai" or "fallback" ──
        console.log("\nTest 5: Source label (AI vs Fallback)\n");

        if (detail.source === "ai") {
          ok('source: "ai" — OPENROUTER_API_KEY is configured and working');
        } else if (detail.source === "fallback") {
          ok(
            'source: "fallback" — OPENROUTER_API_KEY missing/unavailable, fallback system worked correctly'
          );
        } else {
          bad(
            "source is 'ai' or 'fallback'",
            `Got: ${detail.source}`
          );
        }
      }
    } else {
      bad(
        "GET /api/product-details?productId=... responded successfully",
        JSON.stringify(data)
      );
    }
  } else {
    console.log("(productId পাওয়া যায়নি বলে এই ধাপ skip করা হলো)");
  }

  // ── Test 6: search works ──
  console.log("\nTest 6: Search finds the new product\n");

  try {
    const searchResponse = await fetch(
      `${BASE_URL}/api/product-details?search=${encodeURIComponent(
        "No Formula Sample Cream"
      )}`,
      { cache: "no-store" }
    );

    const searchData = await searchResponse.json();

    if (
      searchResponse.ok &&
      searchData.success &&
      Array.isArray(searchData.details) &&
      searchData.details.some((d) => d.productId === productId)
    ) {
      ok("Search by product name returns the new product");
    } else {
      bad(
        "Search by product name returns the new product",
        JSON.stringify(searchData)
      );
    }
  } catch (error) {
    bad("Search by product name returns the new product", String(error));
  }

  printSummary();
}

function printSummary() {
  console.log("\n──────────────────────────────────────────────");
  console.log(`মোট Pass: ${passed}   মোট Fail: ${failed}`);
  console.log("──────────────────────────────────────────────");

  if (failed === 0) {
    console.log("🎉 সবকিছু ঠিকভাবে কাজ করছে।");
  } else {
    console.log(
      "⚠️  কিছু টেস্ট fail হয়েছে — উপরের FAIL লাইনগুলো দেখুন।"
    );
    process.exitCode = 1;
  }

  console.log(
    "\nNote: এই স্ক্রিপ্ট যে টেস্ট প্রোডাক্টটি বানিয়েছে সেটি নাম দিয়ে চেনা যাবে:"
  );
  console.log('  "[TEST] No Formula Sample Cream" (active: false)');
  console.log(
    "চাইলে Admin → Products থেকে খুঁজে ম্যানুয়ালি মুছে ফেলতে পারেন।"
  );
}

main().catch((error) => {
  console.error("\n💥 Test script crashed:", error);
  process.exitCode = 1;
});
'''

applied = 0
skipped = 0
errors = 0

by_file = {}
for p in PATCHES:
    by_file.setdefault(p["file"], []).append(p)

for rel, plist in by_file.items():
    full = os.path.join(ROOT, rel)
    if not os.path.exists(full):
        print(f"[SKIP] file not found: {rel}")
        errors += len(plist)
        continue
    with open(full, encoding="utf-8") as f:
        content = f.read()
    for p in plist:
        if p["new"] in content:
            print(f"[SKIP] already applied: {rel}")
            skipped += 1
            continue
        if content.count(p["old"]) != 1:
            print(f"[CHECK] anchor not found (edit may already differ) -- please check manually: {rel}")
            errors += 1
            continue
        content = content.replace(p["old"], p["new"])
        print(f"[OK] updated: {rel}")
        applied += 1
    with open(full, "w", encoding="utf-8") as f:
        f.write(content)

test_path = os.path.join(ROOT, "scripts", "test-product-details.mjs")
os.makedirs(os.path.dirname(test_path), exist_ok=True)
if os.path.exists(test_path):
    print("[SKIP] already exists: scripts/test-product-details.mjs")
    skipped += 1
else:
    with open(test_path, "w", encoding="utf-8") as f:
        f.write(TEST_SCRIPT)
    print("[OK] created: scripts/test-product-details.mjs")
    applied += 1

pkg_path = os.path.join(ROOT, "package.json")
try:
    with open(pkg_path, encoding="utf-8") as f:
        pkg = json.load(f)
    pkg.setdefault("scripts", {})
    if "test:product-details" in pkg["scripts"]:
        print("[SKIP] already exists: package.json script")
        skipped += 1
    else:
        pkg["scripts"]["test:product-details"] = "node scripts/test-product-details.mjs"
        with open(pkg_path, "w", encoding="utf-8") as f:
            json.dump(pkg, f, indent=2, ensure_ascii=False)
            f.write("\n")
        print("[OK] updated: package.json (test:product-details script)")
        applied += 1
except Exception as e:
    print(f"[WARN] could not update package.json: {e}")
    errors += 1

print()
print("----------------------------------------")
print(f"Applied: {applied}   Skipped: {skipped}   Needs manual check: {errors}")
print("----------------------------------------")
if errors:
    print("Some parts could not be auto-applied (see [CHECK]/[WARN] lines above) -- the file was likely already hand-edited. Please review those spots manually.")
