import mongoose, { Schema, Model, Types } from "mongoose";

/**
 * Wallet ledger. `amount` is the signed change to the vendor's balance.
 *  sale        +  order delivered & paid (net after commission)
 *  reversal    -  settled order later cancelled / refunded
 *  withdrawal  -  payout requested (money held)
 *  withdrawal_refund + payout rejected (money returned)
 *  adjustment  +/- manual admin correction
 */
export interface IVendorTransaction {
  vendorId: Types.ObjectId;
  type: "sale" | "reversal" | "withdrawal" | "withdrawal_refund" | "adjustment";
  amount: number;
  grossAmount?: number;
  commissionRate?: number;
  commissionAmount?: number;
  orderId?: Types.ObjectId;
  payoutId?: Types.ObjectId;
  balanceAfter: number;
  note?: string;
  createdAt?: Date;
}

const VendorTransactionSchema = new Schema<IVendorTransaction>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", required: true, index: true },
    type: {
      type: String,
      enum: ["sale", "reversal", "withdrawal", "withdrawal_refund", "adjustment"],
      required: true,
    },
    amount: { type: Number, required: true },
    grossAmount: Number,
    commissionRate: Number,
    commissionAmount: Number,
    orderId: { type: Schema.Types.ObjectId, ref: "Order" },
    payoutId: { type: Schema.Types.ObjectId, ref: "Payout" },
    balanceAfter: { type: Number, required: true },
    note: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const VendorTransaction: Model<IVendorTransaction> =
  mongoose.models.VendorTransaction ||
  mongoose.model<IVendorTransaction>("VendorTransaction", VendorTransactionSchema);

export default VendorTransaction;
