import mongoose, { Schema, Model, Types } from "mongoose";

export interface IPayout {
  vendorId: Types.ObjectId;
  amount: number;
  method: { type: string; accountName: string; accountNumber: string; bankName?: string };
  status: "pending" | "paid" | "rejected";
  transactionRef?: string;
  adminNote?: string;
  processedAt?: Date;
  createdAt?: Date;
}

const PayoutMethodSchema = new Schema(
  {
    type: { type: String, required: true },
    accountName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    bankName: { type: String },
  },
  { _id: false }
);

const PayoutSchema = new Schema<IPayout>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", required: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    method: { type: PayoutMethodSchema, required: true },
    status: { type: String, enum: ["pending", "paid", "rejected"], default: "pending", index: true },
    transactionRef: { type: String, default: "" },
    adminNote: { type: String, default: "" },
    processedAt: { type: Date },
  },
  { timestamps: true }
);

const Payout: Model<IPayout> =
  mongoose.models.Payout || mongoose.model<IPayout>("Payout", PayoutSchema);

export default Payout;
