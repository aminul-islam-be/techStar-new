import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICoupon extends Document {
  code: string;
  description?: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrder: number;
  maxDiscount?: number;
  startDate?: Date;
  expiryDate: Date;
  // 0 = unlimited
  usageLimit: number;
  usedCount: number;
  // how many times ONE customer may use it (0 = unlimited)
  perUserLimit: number;
  // false = secret code, not shown on the customer's Coupons page
  isPublic: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CouponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, trim: true, maxlength: 120 },
    discountType: { type: String, enum: ["percentage", "fixed"], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    minOrder: { type: Number, default: 0, min: 0 },
    maxDiscount: { type: Number, min: 0 },
    startDate: { type: Date },
    expiryDate: { type: Date, required: true },
    usageLimit: { type: Number, required: true, default: 0, min: 0 },
    usedCount: { type: Number, default: 0, min: 0 },
    perUserLimit: { type: Number, default: 1, min: 0 },
    isPublic: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default (mongoose.models.Coupon as Model<ICoupon>) ||
  mongoose.model<ICoupon>("Coupon", CouponSchema);
