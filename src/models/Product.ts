import mongoose, { Schema, Model } from "mongoose";

export interface IProduct {
  name: string;
  slug: string;
  category: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
  image?: string;
  images?: string[];
  stock: number;
  featured: boolean;
  active: boolean;
  vendorId?: mongoose.Types.ObjectId;
  vendorName?: string;
  approvalStatus?: "approved" | "pending" | "rejected" | "suspended";
  rejectionReason?: string;
  ratingAverage?: number;
  reviewCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    compareAtPrice: {
      type: Number,
      min: 0,
      default: undefined,
    },
    currency: {
      type: String,
      default: "USD",
      uppercase: true,
    },
    image: {
      type: String,
      default: "",
    },
    images: {
      type: [String],
      default: [],
    },
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: true,
    },
    // Marketplace fields. Products added by the admin have no vendorId and
    // are always "approved", so existing products keep working unchanged.
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      index: true,
      default: undefined,
    },
    vendorName: { type: String, default: undefined },
    approvalStatus: {
      type: String,
      enum: ["approved", "pending", "rejected", "suspended"],
      default: "approved",
      index: true,
    },
    rejectionReason: { type: String, default: undefined },
    // filled automatically from approved reviews (see lib/reviewStats.ts)
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
  }
);

const Product: Model<IProduct> =
  mongoose.models.Product ||
  mongoose.model<IProduct>("Product", ProductSchema);

export default Product;
