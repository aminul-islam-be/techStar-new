import mongoose, { Schema, Model, Types } from "mongoose";

/**
 * A customer's request about an order:
 *  return    send the product back, get the product price refunded
 *  refund    money back without sending anything (not received, wrong item...)
 *  exchange  swap for another item
 * `auto` = created by the system when a customer cancels an order that was already paid online.
 */
export interface IOrderRequest {
  orderId: Types.ObjectId;
  userId: Types.ObjectId;
  type: "return" | "refund" | "exchange";
  auto?: boolean;
  reason: string;
  details?: string;
  status: "pending" | "approved" | "rejected" | "completed";
  amount: number; // product price to refund (0 for exchange)
  adminNote?: string;
  refundRef?: string; // bKash / bank / gateway reference of the refund you sent
  processedAt?: Date;
  createdAt?: Date;
}

const OrderRequestSchema = new Schema<IOrderRequest>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["return", "refund", "exchange"], required: true },
    auto: { type: Boolean, default: false },
    reason: { type: String, required: true, trim: true, maxlength: 200 },
    details: { type: String, default: "", trim: true, maxlength: 600 },
    status: { type: String, enum: ["pending", "approved", "rejected", "completed"], default: "pending", index: true },
    amount: { type: Number, default: 0, min: 0 },
    adminNote: { type: String, default: "" },
    refundRef: { type: String, default: "" },
    processedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const OrderRequest: Model<IOrderRequest> =
  mongoose.models.OrderRequest || mongoose.model<IOrderRequest>("OrderRequest", OrderRequestSchema);

export default OrderRequest;
