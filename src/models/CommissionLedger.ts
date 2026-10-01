import mongoose, { Schema, Model, Types } from "mongoose";

/**
 * History of a vendor's COD commission balance.
 *  accrual  COD order delivered  -> vendor owes more
 *  reversal COD order returned   -> commission taken back
 *  payment  vendor paid TechStar -> owes less (extra becomes advance credit)
 *  waiver   admin unlocked without payment
 */
export interface ICommissionLedger {
  vendorId: Types.ObjectId;
  type: "accrual" | "reversal" | "payment" | "waiver";
  amount: number; // always positive
  creditUsed?: number; // advance credit used up by this accrual
  orderId?: Types.ObjectId;
  paymentId?: Types.ObjectId;
  dueAfter: number;
  creditAfter: number;
  month: string; // YYYY-MM (Bangladesh time)
  note?: string;
  createdAt?: Date;
}

const CommissionLedgerSchema = new Schema<ICommissionLedger>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", required: true, index: true },
    type: { type: String, enum: ["accrual", "reversal", "payment", "waiver"], required: true },
    amount: { type: Number, required: true },
    creditUsed: { type: Number, default: 0 },
    orderId: { type: Schema.Types.ObjectId, ref: "Order" },
    paymentId: { type: Schema.Types.ObjectId, ref: "CommissionPayment" },
    dueAfter: { type: Number, required: true },
    creditAfter: { type: Number, required: true },
    month: { type: String, required: true },
    note: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const CommissionLedger: Model<ICommissionLedger> =
  mongoose.models.CommissionLedger ||
  mongoose.model<ICommissionLedger>("CommissionLedger", CommissionLedgerSchema);

export default CommissionLedger;
