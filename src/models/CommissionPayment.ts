import mongoose, { Schema, Model, Types } from "mongoose";

export interface ICommissionPayment {
  vendorId: Types.ObjectId;
  amount: number;
  status: "pending" | "paid" | "failed" | "cancelled";
  gateway: "sslcommerz" | "manual";
  tranId: string; // our reference, also sent to the gateway
  gatewayRef?: string; // bank / gateway transaction id
  note?: string;
  paidAt?: Date;
  createdAt?: Date;
}

const CommissionPaymentSchema = new Schema<ICommissionPayment>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", required: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ["pending", "paid", "failed", "cancelled"], default: "pending", index: true },
    gateway: { type: String, enum: ["sslcommerz", "manual"], default: "sslcommerz" },
    tranId: { type: String, required: true, unique: true },
    gatewayRef: { type: String, default: "" },
    note: { type: String, default: "" },
    paidAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const CommissionPayment: Model<ICommissionPayment> =
  mongoose.models.CommissionPayment ||
  mongoose.model<ICommissionPayment>("CommissionPayment", CommissionPaymentSchema);

export default CommissionPayment;
