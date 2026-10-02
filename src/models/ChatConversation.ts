import mongoose, { Schema, Model, Types } from "mongoose";

export interface IChatConversation {
  customerId: Types.ObjectId;
  customerName: string; // first name only
  /** empty for TechStar support chats (questions about TechStar's own products) */
  vendorId?: Types.ObjectId;
  vendorName: string; // the shop name, or "TechStar" for support chats
  /** true = the customer is talking to the TechStar owner/admin, not to a vendor */
  isPlatform?: boolean;
  productId?: Types.ObjectId;
  productName?: string;
  lastMessageAt: Date;
  lastMessageText: string;
  unreadCustomer: number;
  /** vendor chats: unread for the vendor. TechStar chats: unread for the admin. */
  unreadVendor: number;
  violationsCustomer: number;
  violationsVendor: number;
  locked: boolean; // vendor can no longer reply (too many blocked messages / admin action)
  reported: boolean;
  reportReason?: string;
  reportedAt?: Date;
}

const ChatConversationSchema = new Schema<IChatConversation>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    customerName: { type: String, default: "Customer" },
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", index: true },
    vendorName: { type: String, default: "Seller" },
    isPlatform: { type: Boolean, default: false, index: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product" },
    productName: { type: String },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    lastMessageText: { type: String, default: "" },
    unreadCustomer: { type: Number, default: 0 },
    unreadVendor: { type: Number, default: 0 },
    violationsCustomer: { type: Number, default: 0 },
    violationsVendor: { type: Number, default: 0 },
    locked: { type: Boolean, default: false },
    reported: { type: Boolean, default: false },
    reportReason: { type: String },
    reportedAt: { type: Date },
  },
  { timestamps: true }
);

// one conversation per customer + vendor pair. For TechStar chats the vendor is empty,
// so this also gives exactly one TechStar chat per customer.
ChatConversationSchema.index({ customerId: 1, vendorId: 1 }, { unique: true });

const ChatConversation: Model<IChatConversation> =
  mongoose.models.ChatConversation ||
  mongoose.model<IChatConversation>("ChatConversation", ChatConversationSchema);

export default ChatConversation;
