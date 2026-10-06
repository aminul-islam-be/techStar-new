import mongoose, { Schema, Document, Model } from "mongoose";

/** One row per order that used a coupon: this is the customer usage tracking. */
export interface ICouponUsage extends Document {
  couponId: mongoose.Types.ObjectId;
  code: string;
  userId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  discountAmount: number;
  // "released" = the order was cancelled, so the coupon use is given back
  status: "used" | "released";
  createdAt: Date;
}

const CouponUsageSchema = new Schema<ICouponUsage>(
  {
    couponId: { type: Schema.Types.ObjectId, ref: "Coupon", required: true },
    code: { type: String, required: true, uppercase: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
    discountAmount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["used", "released"], default: "used" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

CouponUsageSchema.index({ couponId: 1, userId: 1, status: 1 });
CouponUsageSchema.index({ couponId: 1, createdAt: -1 });

export default (mongoose.models.CouponUsage as Model<ICouponUsage>) ||
  mongoose.model<ICouponUsage>("CouponUsage", CouponUsageSchema);
