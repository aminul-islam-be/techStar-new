import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProductIngredient {
  name: string;
  function: string;
  amount: string;
}

export interface IProductDetail extends Document {
  productId?: mongoose.Types.ObjectId | null;
  productName: string;
  category: string;
  purpose: string;
  benefits: string[];
  howToUse: string;
  suitableFor: string;
  ingredients: IProductIngredient[];
  safety: string;
  storage: string;
  source: "pdf" | "ai" | "fallback";
  generatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProductIngredientSchema = new Schema<IProductIngredient>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    function: {
      type: String,
      default: "Not provided",
      trim: true,
    },
    amount: {
      type: String,
      default: "Not provided",
      trim: true,
    },
  },
  { _id: false }
);

const ProductDetailSchema = new Schema<IProductDetail>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      default: null,
      index: true,
    },

    productName: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      default: "Other",
      trim: true,
    },

    purpose: {
      type: String,
      default: "Not provided",
      trim: true,
    },

    benefits: {
      type: [String],
      default: [],
    },

    howToUse: {
      type: String,
      default: "Use according to the product label.",
      trim: true,
    },

    suitableFor: {
      type: String,
      default: "Not specified",
      trim: true,
    },

    ingredients: {
      type: [ProductIngredientSchema],
      default: [],
    },

    safety: {
      type: String,
      default:
        "For external use only. Perform a patch test before regular use. Stop use if irritation occurs.",
      trim: true,
    },

    storage: {
      type: String,
      default: "Store in a cool, dry place away from direct sunlight.",
      trim: true,
    },

    source: {
      type: String,
      enum: ["pdf", "ai", "fallback"],
      default: "fallback",
    },

    generatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const ProductDetail: Model<IProductDetail> =
  mongoose.models.ProductDetail ||
  mongoose.model<IProductDetail>("ProductDetail", ProductDetailSchema);

export default ProductDetail;
