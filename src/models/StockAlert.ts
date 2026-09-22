import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStockAlert extends Document {
  productId: mongoose.Types.ObjectId;
  productName: string;
  contact: string;
  userId?: mongoose.Types.ObjectId;
  notified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StockAlertSchema = new Schema<IStockAlert>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    contact: {
      type: String,
      required: true,
      trim: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    notified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// One alert per product+contact pair — resubmitting just refreshes it.
StockAlertSchema.index({ productId: 1, contact: 1 }, { unique: true });

const StockAlert: Model<IStockAlert> =
  mongoose.models.StockAlert ||
  mongoose.model<IStockAlert>("StockAlert", StockAlertSchema);

export default StockAlert;
