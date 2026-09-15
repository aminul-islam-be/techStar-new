import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI পাওয়া যায়নি");
  process.exit(1);
}

const ingredientSchema = new mongoose.Schema(
  {
    name: String,
    function: String,
    amount: String,
  },
  { _id: false }
);

const productDetailSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    productName: { type: String, required: true },
    category: { type: String, default: "Cosmetics" },
    purpose: { type: String, default: "" },
    benefits: { type: [String], default: [] },
    howToUse: { type: String, default: "" },
    suitableFor: { type: String, default: "" },
    ingredients: {
      type: [ingredientSchema],
      default: [],
    },
    safety: { type: String, default: "" },
    storage: { type: String, default: "" },
    source: {
      type: String,
      enum: ["pdf", "ai", "fallback"],
      default: "pdf",
    },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const ProductDetail =
  mongoose.models.ProductDetail ||
  mongoose.model("ProductDetail", productDetailSchema);

const I = (name, func, amount) => ({
  name,
  function: func,
  amount,
});

const commonSafety =
  "Patch test before use. Keep away from eyes. Keep out of reach of children. " +
  "These formulas are illustrative and should not be treated as validated commercial manufacturing specifications.";

const commonStorage =
  "Store in a clean, dry place away from direct sunlight and excessive heat.";

const products = [
  {
    productName: "Face Wash",
    category: "Face Care",
    purpose: "Gentle facial cleansing",
    benefits: ["Cleanses skin", "Helps remove excess oil", "Provides moisture"],
    howToUse: "Apply to wet face, gently massage, then rinse with clean water.",
    suitableFor: "General facial skin care",
    ingredients: [
      I("Distilled Water", "Base", "65%"),
      I("Coco Betaine", "Foam and cleanser", "20%"),
      I("Decyl Glucoside", "Mild cleanser", "10%"),
      I("Glycerin", "Moisture", "3%"),
      I("Xanthan Gum", "Thickener", "1%"),
      I("Preservative & Fragrance", "Preservation and fragrance", "1%"),
    ],
    safety: commonSafety,
    storage: commonStorage,
  },

  {
    productName: "Face Scrub",
    category: "Face Care",
    purpose: "Physical exfoliation",
    benefits: ["Helps remove dead skin cells", "Leaves skin feeling smoother"],
    howToUse: "Apply gently to damp skin, massage lightly, then rinse.",
    suitableFor: "General facial skin care",
    ingredients: [
      I("Sugar / Walnut Powder", "Scrubbing/dead-cell removal", "50%"),
      I("Olive Oil", "Smoothness", "40%"),
      I("Honey", "Glow", "5%"),
      I("Emulsifying Wax", "Creamy texture", "4%"),
      I("Preservative", "Preservation", "1%"),
    ],
    safety: commonSafety,
    storage: commonStorage,
  },

  {
    productName: "Face Toner",
    category: "Face Care",
    purpose: "Refreshing facial toner",
    benefits: ["Refreshes skin", "Provides moisture", "Supports a clean skin feel"],
    howToUse: "Apply to clean skin using cotton or clean hands.",
    suitableFor: "General facial skin care",
    ingredients: [
      I("Rose Water", "Refreshment", "80%"),
      I("Witch Hazel", "Pore tightening", "15%"),
      I("Glycerin", "Moisture", "4%"),
      I("Liquid Preservative", "Preservation", "1%"),
    ],
    safety: commonSafety,
    storage: commonStorage,
  },

  {
    productName: "Day Cream",
    category: "Face Care",
    purpose: "Daytime moisturizing cream",
    benefits: ["Moisturizes skin", "Helps soothe skin", "Provides nourishment"],
    howToUse: "Apply a small amount evenly to clean face.",
    suitableFor: "General facial skin care",
    ingredients: [
      I("Distilled Water", "Base", "70%"),
      I("Aloe Vera Gel", "Soothing", "10%"),
      I("Sweet Almond Oil", "Nutrition", "10%"),
      I("Emulsifying Wax", "Emulsion", "6%"),
      I("Cetyl Alcohol", "Thickness", "2%"),
      I("Vitamin E & Preservative", "Care and preservation", "2%"),
    ],
    safety: commonSafety,
    storage: commonStorage,
  },

  {
    productName: "Night Cream",
    category: "Face Care",
    purpose: "Nighttime nourishing cream",
    benefits: ["Deep nourishment", "Moisturizes skin", "Provides skin care"],
    howToUse: "Apply a small amount to clean face before bedtime.",
    suitableFor: "General facial skin care",
    ingredients: [
      I("Distilled Water", "Base", "60%"),
      I("Shea Butter", "Deep nourishment", "15%"),
      I("Jojoba Oil", "Care", "15%"),
      I("Emulsifying Wax", "Emulsion", "7%"),
      I("Cetyl Alcohol", "Thickness", "2%"),
      I("Preservative", "Preservation", "1%"),
    ],
    safety: commonSafety,
    storage: commonStorage,
  },

  {
    productName: "Vitamin C Serum",
    category: "Face Care",
    purpose: "Brightening facial serum",
    benefits: ["Brightening", "Moisture support", "Helps improve smoothness"],
    howToUse: "Apply a small amount to clean skin and gently spread.",
    suitableFor: "General facial skin care",
    ingredients: [
      I("Distilled Water", "Base", "75%"),
      I("L-Ascorbic Acid (Vit C)", "Brightening", "10%"),
      I("Glycerin", "Moisture", "5%"),
      I("Hyaluronic Acid", "Smoothness", "2%"),
      I("Propylene Glycol", "Absorption", "7.5%"),
      I("Preservative", "Preservation", "0.5%"),
    ],
    safety: commonSafety,
    storage: commonStorage,
  },

  {
    productName: "Mud/Clay Mask",
    category: "Face Care",
    purpose: "Clay-based facial mask",
    benefits: ["Helps absorb excess oil", "Soothes skin", "Provides moisture"],
    howToUse: "Apply an even layer to clean skin, leave briefly, then rinse.",
    suitableFor: "General facial skin care",
    ingredients: [
      I("Bentonite Clay", "Oil absorption", "40%"),
      I("Distilled Water", "Base", "50%"),
      I("Glycerin", "Moisture", "5%"),
      I("Aloe Vera Extract", "Soothing", "4%"),
      I("Preservative", "Preservation", "1%"),
    ],
    safety: commonSafety,
    storage: commonStorage,
  },

  {
    productName: "Peel-off Mask",
    category: "Face Care",
    purpose: "Peel-off facial mask",
    benefits: ["Peel-off effect", "Provides nourishment", "Helps moisturize"],
    howToUse: "Apply evenly to clean skin, allow to dry, then gently peel off.",
    suitableFor: "General facial skin care",
    ingredients: [
      I("Distilled Water", "Base", "60%"),
      I("PVA", "Peel-off effect", "15%"),
      I("Ethyl Alcohol", "Fast drying", "15%"),
      I("Glycerin", "Moisture", "5%"),
      I("Botanical Extract", "Nourishment", "4%"),
      I("Preservative", "Preservation", "1%"),
    ],
    safety: commonSafety,
    storage: commonStorage,
  },

  {
    productName: "Eye Cream",
    category: "Face Care",
    purpose: "Eye-area moisturizing cream",
    benefits: ["Moisturizes eye area", "Supports fine-line care", "Provides nourishment"],
    howToUse: "Apply a very small amount around the eye area without direct eye contact.",
    suitableFor: "General eye-area skin care",
    ingredients: [
      I("Distilled Water", "Base", "70%"),
      I("Caffeine Extract", "Dark-circle care", "3%"),
      I("Rosehip Oil", "Fine-line care", "12%"),
      I("Emulsifying Wax", "Emulsion", "6%"),
      I("Shea Butter", "Moisture", "7.5%"),
      I("Preservative", "Preservation", "0.5%"),
    ],
    safety: commonSafety,
    storage: commonStorage,
  },

  {
    productName: "Lip Balm",
    category: "Lip Care",
    purpose: "Lip moisturizing balm",
    benefits: ["Softens lips", "Helps prevent dryness", "Provides moisture"],
    howToUse: "Apply a small amount directly to the lips as needed.",
    suitableFor: "General lip care",
    ingredients: [
      I("Beeswax", "Structure", "25%"),
      I("Cocoa Butter", "Softening", "25%"),
      I("Almond Oil", "Moisturizer", "49%"),
      I("Flavor Oil", "Fragrance/taste", "1%"),
    ],
    safety: commonSafety,
    storage: commonStorage,
  },

  {
    productName: "Lip Scrub",
    category: "Lip Care",
    purpose: "Lip exfoliation",
    benefits: ["Helps remove dead cells", "Provides moisture", "Leaves lips smoother"],
    howToUse: "Gently massage a small amount onto lips, then remove.",
    suitableFor: "General lip care",
    ingredients: [
      I("Caster Sugar", "Dead-cell removal", "60%"),
      I("Jojoba Oil", "Nutrition", "30%"),
      I("Honey", "Moisture", "8%"),
      I("Flavor/Color", "Attractive appearance", "2%"),
    ],
    safety: commonSafety,
    storage: commonStorage,
  },

  {
    productName: "Micellar Water",
    category: "Face Care",
    purpose: "Makeup and facial cleansing",
    benefits: ["Helps remove makeup", "Cleanses skin", "Provides moisture"],
    howToUse: "Apply to cotton and gently wipe the face.",
    suitableFor: "General facial cleansing",
    ingredients: [
      I("Distilled Water", "Base", "90%"),
      I("PEG-6 Caprylic", "Makeup removal/Surfactant", "6%"),
      I("Glycerin", "Moisture", "3%"),
      I("Preservative", "Preservation", "1%"),
    ],
    safety: commonSafety,
    storage: commonStorage,
  },

  {
    productName: "Cleansing Milk",
    category: "Face Care",
    purpose: "Gentle facial cleansing",
    benefits: ["Cleanses skin", "Helps remove impurities", "Moisturizes"],
    howToUse: "Massage gently onto face, then wipe or rinse as appropriate.",
    suitableFor: "General facial skin care",
    ingredients: [
      I("Distilled Water", "Base", "75%"),
      I("Mineral Oil", "Cleansing", "12%"),
      I("Emulsifying Wax", "Emulsion", "5%"),
      I("Glycerin", "Moisture", "5%"),
      I("Preservative", "Preservation", "1%"),
    ],
    safety: commonSafety,
    storage: commonStorage,
  },

  {
    productName: "BB Cream - Basic",
    category: "Face Care",
    purpose: "Basic skin-care and tone-evening cream",
    benefits: ["Provides skin care", "Helps create a smooth finish", "Provides tone coverage"],
    howToUse: "Apply a suitable amount evenly over clean skin.",
    suitableFor: "General facial use",
    ingredients: [
      I("Base Lotion", "Skin care", "80%"),
      I("Titanium Dioxide", "Sun protection/white pigment", "10%"),
      I("Iron Oxides", "Skin tone", "8%"),
      I("Silicone Oil", "Smooth finish", "2%"),
    ],
    safety: commonSafety,
    storage: commonStorage,
  },

  {
    productName: "Sunscreen (Physical)",
    category: "Face Care",
    purpose: "Physical UV protection",
    benefits: ["UV protection", "Moisturization", "Skin care"],
    howToUse: "Apply evenly to exposed skin before sun exposure.",
    suitableFor: "General skin care",
    ingredients: [
      I("Distilled Water", "Base", "60%"),
      I("Non-nano Zinc Oxide", "UV protection", "20%"),
      I("Shea Butter & Oil", "Moisturizer", "12%"),
      I("Emulsifying Wax", "Emulsion", "6%"),
      I("Preservative", "Preservation", "2%"),
    ],
    safety: commonSafety,
    storage: commonStorage,
  },

  {
    productName: "Body Lotion",
    category: "Body Care",
    purpose: "Body moisturizing lotion",
    benefits: ["Moisturizes skin", "Provides nourishment", "Helps soften skin"],
    howToUse: "Apply evenly to clean body skin and massage gently.",
    suitableFor: "General body skin care",
    ingredients: [
      I("Distilled Water", "Base", "75%"),
      I("Sweet Almond Oil", "Nourishment", "12%"),
      I("Emulsifying Wax", "Emulsion", "5%"),
      I("Glycerin", "Moisture", "4%"),
      I("Cetyl Alcohol", "Thickness", "2%"),
      I("Preservative & Fragrance", "Preservation/fragrance", "2%"),
    ],
    safety: commonSafety,
    storage: commonStorage,
  },

  {
    productName: "Body Butter",
    category: "Body Care",
    purpose: "Deeply nourishing body butter",
    benefits: ["Deep nourishment", "Moisturizes", "Helps improve skin smoothness"],
    howToUse: "Apply a small amount to clean skin and massage gently.",
    suitableFor: "General body skin care",
    ingredients: [
      I("Shea Butter", "Deep nourishment", "40%"),
      I("Cocoa Butter", "Moisture/structure", "30%"),
      I("Coconut Oil", "Smoothness", "20%"),
      I("Arrowroot Powder", "Reduce greasiness", "8%"),
      I("Vitamin E & Fragrance", "Care/fragrance", "2%"),
    ],
    safety: commonSafety,
    storage: commonStorage,
  },

  {
    productName: "Body Wash / Shower Gel",
    category: "Body Care",
    purpose: "Body cleansing wash",
    benefits: ["Cleanses skin", "Creates foam", "Provides moisture"],
    howToUse: "Apply to wet skin, lather gently, then rinse thoroughly.",
    suitableFor: "General body cleansing",
    ingredients: [
      I("Distilled Water", "Base", "50%"),
      I("SLES", "Foam", "30%"),
      I("Coco Betaine", "Mild cleanser", "10%"),
      I("Glycerin", "Moisture", "5%"),
      I("NaCl", "Viscosity", "3%"),
      I("Preservative & Fragrance", "Preservation/fragrance", "2%"),
    ],
    safety: commonSafety,
    storage: commonStorage,
  },

  {
    productName: "Natural Soap (Cold Process)",
    category: "Body Care",
    purpose: "Cold-process natural soap for cleansing",
    benefits: ["Cleansing", "Smoothness", "Foam creation", "Soap hardness"],
    howToUse: "Use a suitable amount with water to cleanse the skin, then rinse thoroughly.",
    suitableFor: "General body cleansing",
    ingredients: [
      I("Olive Oil", "Smoothness", "40%"),
      I("Coconut Oil", "Foam creation", "30%"),
      I("Palm Oil", "Hardness", "30%"),
      I("Caustic Soda (NaOH)", "Convert oils to soap", "According to SAP value"),
      I("Water", "Dissolve soda", "Twice the soda"),
    ],
    safety: "Patch test before use. Cold-process soap making involves caustic soda (NaOH), which requires appropriate safety precautions. Use suitable protective equipment and follow a validated manufacturing procedure.",
    storage: commonStorage,
  },

  {
    productName: "Body Scrub",
    category: "Body Care",
    purpose: "Physical body exfoliation",
    benefits: ["Helps remove dead skin cells", "Provides smoothness", "Easy washing"],
    howToUse: "Gently massage onto damp skin, then rinse thoroughly.",
    suitableFor: "General body skin care",
    ingredients: [
      I("Sea Salt / Sugar", "Scrubbing", "60%"),
      I("Olive Oil", "Smoothness", "35%"),
      I("Polysorbate 80", "Easy washing", "3%"),
      I("Essential Oil", "Fragrance", "2%"),
    ],
    safety: commonSafety,
    storage: commonStorage,
  },

  {
    productName: "Hand Cream",
    category: "Body Care",
    purpose: "Hand moisturizing cream",
    benefits: ["Moisturizes hands", "Helps reduce roughness", "Softens skin"],
    howToUse: "Apply to clean hands and massage gently.",
    suitableFor: "General hand skin care",
    ingredients: [
      I("Distilled Water", "Base", "60%"),
      I("Shea Butter", "Reduce roughness", "20%"),
      I("Glycerin", "Moisture", "10%"),
      I("Emulsifying Wax", "Emulsion", "6%"),
      I("Cetyl Alcohol", "Thickness", "2%"),
      I("Preservative", "Preservation", "2%"),
    ],
    safety: commonSafety,
    storage: commonStorage,
  },

  {
    productName: "Foot Cream",
    category: "Body Care",
    purpose: "Foot moisturizing cream",
    benefits: ["Helps prevent cracking", "Softens dead skin", "Provides cooling effect"],
    howToUse: "Apply to clean feet and massage gently.",
    suitableFor: "General foot skin care",
    ingredients: [
      I("Distilled Water", "Base", "50%"),
      I("Cocoa Butter", "Prevent cracking", "20%"),
      I("Urea", "Soften dead cells", "10%"),
      I("Mint Oil/Menthol", "Cooling effect", "2%"),
      I("Emulsifying Wax", "Emulsion", "6%"),
      I("Preservative", "Preservation", "12%"),
    ],
    safety: commonSafety,
    storage: commonStorage,
  },

  {
    productName: "Massage Oil",
    category: "Body Care",
    purpose: "Body massage oil blend",
    benefits: ["Provides smooth massage", "Supports skin nourishment", "Provides relaxation"],
    howToUse: "Apply a suitable amount to skin and massage gently.",
    suitableFor: "General body massage",
    ingredients: [
      I("Sweet Almond Oil", "Base oil", "50%"),
      I("Jojoba Oil", "Absorption", "30%"),
      I("Grapeseed Oil", "Antioxidant", "18%"),
      I("Lavender Essential Oil", "Relaxation", "2%"),
    ],
    safety: commonSafety,
    storage: commonStorage,
  },

  {
    productName: "Shampoo - Basic",
    category: "Hair Care",
    purpose: "Basic hair cleansing shampoo",
    benefits: ["Cleanses hair", "Creates foam", "Provides mildness"],
    howToUse: "Apply to wet hair, massage gently, then rinse thoroughly.",
    suitableFor: "General hair care",
    ingredients: [
      I("Distilled Water", "Base", "60%"),
      I("SLES", "Cleanser/foaming", "25%"),
      I("Coco Betaine", "Mildness", "8%"),
      I("Polyquaternium-7", "Conditioning", "2%"),
      I("Salt", "Viscosity", "3%"),
      I("Preservative, Color, Fragrance", "Other", "2%"),
    ],
    safety: commonSafety,
    storage: commonStorage,
  },

  {
    productName: "Hair Conditioner",
    category: "Hair Care",
    purpose: "Hair conditioning treatment",
    benefits: ["Softens hair", "Improves silky feel", "Provides nourishment"],
    howToUse: "Apply to clean wet hair, leave briefly, then rinse.",
    suitableFor: "General hair care",
    ingredients: [
      I("Distilled Water", "Base", "80%"),
      I("BTMS-50", "Softening", "5%"),
      I("Cetyl Alcohol", "Thickness", "3%"),
      I("Dimethicone", "Silky feel", "2%"),
      I("Argan Oil", "Nourishment", "8%"),
      I("Preservative & Fragrance", "Preservation", "2%"),
    ],
    safety: commonSafety,
    storage: commonStorage,
  },

  {
    productName: "Hair Serum",
    category: "Hair Care",
    purpose: "Hair smoothing and shine serum",
    benefits: ["Silky feel", "Adds shine", "Provides nourishment"],
    howToUse: "Apply a small amount to hair, especially the lengths and ends.",
    suitableFor: "General hair care",
    ingredients: [
      I("Cyclomethicone", "Base/fast drying", "60%"),
      I("Dimethicone", "Silky feel and shine", "30%"),
      I("Argan Oil", "Nourishment", "8%"),
      I("Fragrance", "Fragrance", "2%"),
    ],
    safety: commonSafety,
    storage: commonStorage,
  },

  {
    productName: "Hair Mask/Protein Pack",
    category: "Hair Care",
    purpose: "Hair conditioning and protein treatment",
    benefits: ["Softening", "Protein supply", "Nourishment"],
    howToUse: "Apply to clean damp hair, leave for a suitable period, then rinse.",
    suitableFor: "General hair care",
    ingredients: [
      I("Distilled Water", "Base", "70%"),
      I("BTMS-50", "Softening", "6%"),
      I("Hydrolyzed Keratin", "Protein supply", "4%"),
      I("Castor Oil", "Hair-fall care", "10%"),
      I("Shea Butter", "Nourishment", "8%"),
      I("Preservative", "Preservation", "2%"),
    ],
    safety: commonSafety,
    storage: commonStorage,
  },

  {
    productName: "Hair Oil Blend",
    category: "Hair Care",
    purpose: "Nourishing hair oil blend",
    benefits: ["Nourishment", "Smoothness", "Hair-fall care"],
    howToUse: "Apply a suitable amount to scalp and hair and massage gently.",
    suitableFor: "General hair care",
    ingredients: [
      I("Coconut Oil", "Base", "40%"),
      I("Castor Oil", "Hair growth care", "20%"),
      I("Olive Oil", "Nourishment", "20%"),
      I("Almond Oil", "Smoothness", "18%"),
      I("Rosemary Essential Oil", "Hair-fall care", "2%"),
    ],
    safety: commonSafety,
    storage: commonStorage,
  },

  {
    productName: "Makeup Remover Oil",
    category: "Face Care",
    purpose: "Oil-based makeup removal",
    benefits: ["Helps dissolve makeup", "Provides smoothness", "Reduces greasy feel"],
    howToUse: "Massage gently onto face, then remove with a suitable cleanser or rinse.",
    suitableFor: "General facial cleansing",
    ingredients: [
      I("Jojoba Oil", "Dissolve makeup", "45%"),
      I("Sweet Almond Oil", "Base", "50%"),
      I("Caprylic Triglyceride", "Reduce greasiness", "4%"),
      I("Vitamin E", "Antioxidant", "1%"),
    ],
    safety: commonSafety,
    storage: commonStorage,
  },

  {
    productName: "Aloe Vera Soothing Gel",
    category: "Face Care",
    purpose: "Soothing and moisturizing gel",
    benefits: ["Soothing", "Moisturizing", "Gel-based skin care"],
    howToUse: "Apply a suitable amount to clean skin and spread gently.",
    suitableFor: "General skin care",
    ingredients: [
      I("Distilled Water", "Base", "90%"),
      I("Aloe Vera Powder (200x)", "Main ingredient", "0.5%"),
      I("Carbomer 940", "Gel formation", "1%"),
      I("TEA (Triethanolamine)", "Gel thickening", "1%"),
      I("Glycerin", "Moisture", "5%"),
      I("Preservative", "Preservation", "2.5%"),
    ],
    safety: commonSafety,
    storage: commonStorage,
  },

];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ MongoDB connected");

    let count = 0;

    for (const product of products) {
      await ProductDetail.findOneAndUpdate(
        { productName: product.productName },
        {
          $set: {
            productId: null,
            productName: product.productName,
            category: product.category,
            purpose: product.purpose,
            benefits: product.benefits,
            howToUse: product.howToUse,
            suitableFor: product.suitableFor,
            ingredients: product.ingredients,
            safety: product.safety,
            storage: product.storage,
            source: "pdf",
            generatedAt: new Date(),
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );

      count++;
      console.log(`✅ ${count}/30 — ${product.productName}`);
    }

    console.log("");
    console.log(`🎉 Product Details seed completed: ${count} products`);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("🔌 MongoDB disconnected");
  }
}

seed();
