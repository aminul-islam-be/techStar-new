/**
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
