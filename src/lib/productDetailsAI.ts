import ProductDetail from "@/models/ProductDetail";
import dbConnect from "@/lib/mongodb";

type ProductInput = {
  _id?: string;
  name: string;
  category?: string;
  description?: string;
  price?: number;
  stock?: number;
  // Optional: a real formula/ingredient list typed in by the admin.
  // When present (with at least one named ingredient), this is used
  // as-is for the "ingredients" field instead of asking the AI to
  // guess -- the AI is only used for the descriptive text.
  ingredients?: Ingredient[];
};

type Ingredient = {
  name: string;
  function: string;
  amount: string;
};

type GeneratedDetails = {
  productName: string;
  category: string;
  purpose: string;
  benefits: string[];
  howToUse: string;
  suitableFor: string;
  ingredients: Ingredient[];
  safety: string;
  storage: string;
};

function fallbackDetails(product: ProductInput): GeneratedDetails {
  return {
    productName: product.name,
    category: product.category || "Other",

    purpose:
      product.description ||
      `A ${product.category || "cosmetic"} product available from TechStar.`,

    benefits: [
      "Designed according to the product description.",
      "Easy to use as directed on the product label.",
      "Product information can be updated by the administrator.",
    ],

    howToUse:
      "Use according to the product label and manufacturer's instructions.",

    suitableFor:
      "Suitability depends on the product formulation and individual needs.",

    ingredients: [
      {
        name: "Ingredient information",
        function: "Not provided",
        amount: "Not provided",
      },
    ],

    safety:
      "For external use where applicable. Perform a patch test before regular use. Stop use if irritation or discomfort occurs.",

    storage:
      "Store according to the product label in a cool, dry place away from direct sunlight.",
  };
}

function sanitizeManualIngredients(
  ingredients: Ingredient[] | undefined
): Ingredient[] {
  if (!Array.isArray(ingredients)) return [];

  return ingredients
    .map((ing) => ({
      name: (ing?.name || "").trim(),
      function: (ing?.function || "").trim() || "Not provided",
      amount: (ing?.amount || "").trim() || "Not provided",
    }))
    .filter((ing) => ing.name.length > 0);
}

function cleanJsonText(text: string): string {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

async function generateWithAI(
  product: ProductInput,
  knownIngredientNames: string[]
): Promise<GeneratedDetails | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return null;
  }

  const model =
    process.env.OPENROUTER_MODEL ||
    "nvidia/nemotron-3-ultra-550b-a55b:free";

  const knownIngredientsLine =
    knownIngredientNames.length > 0
      ? `Known ingredients (admin-provided, names only -- you may mention these in the description, but do NOT invent amounts/percentages for them): ${knownIngredientNames.join(", ")}`
      : "Ingredients: Not provided by admin.";

  const prompt = `
You are TechStar's product-details assistant.

Create structured product details for this product.

PRODUCT:
Name: ${product.name}
Category: ${product.category || "Other"}
Description: ${product.description || "Not provided"}
${knownIngredientsLine}

IMPORTANT RULES:
1. Do NOT invent chemical ingredients or percentages.
2. Do NOT invent formulation percentages.
3. If ingredients or percentages are not supplied, use "Not provided".
4. Do not make medical claims.
5. Benefits must be reasonable cosmetic/product descriptions.
6. Return ONLY valid JSON.
7. Keep the same structure every time.
8. Leave the "ingredients" array EMPTY ([]) in your JSON response -- ingredient data is handled separately and will be ignored either way.

JSON structure:
{
  "productName": "string",
  "category": "string",
  "purpose": "string",
  "benefits": ["string"],
  "howToUse": "string",
  "suitableFor": "string",
  "ingredients": [],
  "safety": "string",
  "storage": "string"
}
`;

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer":
            process.env.NEXT_PUBLIC_SITE_URL ||
            "https://techstar-new.vercel.app",
          "X-Title": "TechStar Product Details",
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content:
                "You are a careful product information assistant. Never fabricate chemical formulation data.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      console.error(
        "OpenRouter error:",
        response.status,
        await response.text()
      );
      return null;
    }

    const data = await response.json();

    const content = data?.choices?.[0]?.message?.content;

    if (!content || typeof content !== "string") {
      return null;
    }

    const parsed = JSON.parse(cleanJsonText(content));

    return {
      productName: parsed.productName || product.name,
      category: parsed.category || product.category || "Other",
      purpose: parsed.purpose || product.description || "Not provided",
      benefits: Array.isArray(parsed.benefits) ? parsed.benefits : [],
      howToUse:
        parsed.howToUse ||
        "Use according to the product label and manufacturer's instructions.",
      suitableFor: parsed.suitableFor || "Not specified",
      ingredients: Array.isArray(parsed.ingredients)
        ? parsed.ingredients.map((item: any) => ({
            name: item?.name || "Ingredient information",
            function: item?.function || "Not provided",
            amount: item?.amount || "Not provided",
          }))
        : [
            {
              name: "Ingredient information",
              function: "Not provided",
              amount: "Not provided",
            },
          ],
      safety:
        parsed.safety ||
        "For external use. Perform a patch test before regular use.",
      storage:
        parsed.storage ||
        "Store in a cool, dry place away from direct sunlight.",
    };
  } catch (error) {
    console.error("AI product detail generation failed:", error);
    return null;
  }
}

export async function generateProductDetails(product: ProductInput) {
  await dbConnect();

  const manualIngredients = sanitizeManualIngredients(product.ingredients);
  let hasManualFormula = manualIngredients.length > 0;

  // Safety net: if this call didn't include a formula, but the product
  // already has an admin-entered ("manual") formula saved, keep it --
  // never let a routine regenerate silently wipe out real formula data.
  let ingredientsToSave = manualIngredients;
  let preservedSource: "pdf" | "manual" | null = null;

  if (!hasManualFormula) {
    const existing = await ProductDetail.findOne(
      product._id
        ? { productId: product._id }
        : { productName: product.name }
    ).lean();

    if (
      existing &&
      ["manual", "pdf"].includes((existing as any).source) &&
      Array.isArray((existing as any).ingredients) &&
      (existing as any).ingredients.length > 0
    ) {
      ingredientsToSave = (existing as any).ingredients;
      hasManualFormula = true;
      preservedSource = (existing as any).source;
    }
  }

  const aiDetails = await generateWithAI(
    product,
    hasManualFormula ? ingredientsToSave.map((ing) => ing.name) : []
  );
  const details = aiDetails || fallbackDetails(product);

  // If the admin typed in a real formula (new or previously saved),
  // that always wins for the "ingredients" field -- never let the
  // AI/fallback text override it.
  const ingredients = hasManualFormula
    ? ingredientsToSave
    : details.ingredients;

  const source: "ai" | "fallback" | "manual" | "pdf" = preservedSource
    ? preservedSource
    : hasManualFormula
    ? "manual"
    : aiDetails
    ? "ai"
    : "fallback";

  const saved = await ProductDetail.findOneAndUpdate(
    product._id
      ? { productId: product._id }
      : { productName: product.name },

    {
      $set: {
        productId: product._id || null,
        productName: details.productName,
        category: details.category,
        purpose: details.purpose,
        benefits: details.benefits,
        howToUse: details.howToUse,
        suitableFor: details.suitableFor,
        ingredients,
        safety: details.safety,
        storage: details.storage,
        source,
        generatedAt: new Date(),
      },
    },

    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  return saved;
}
