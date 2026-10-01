import mongoose, { Schema, Model, Types } from "mongoose";

export interface IChatMessage {
  conversationId: Types.ObjectId;
  sender: "customer" | "vendor";
  text: string;
  /** true = was rejected by the contact filter. Never shown to the other side, only to admin. */
  blocked: boolean;
  blockReason?: string;
  createdAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "ChatConversation", required: true },
    sender: { type: String, enum: ["customer", "vendor"], required: true },
    text: { type: String, required: true, maxlength: 600 },
    blocked: { type: Boolean, default: false },
    blockReason: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ChatMessageSchema.index({ conversationId: 1, createdAt: 1 });

const ChatMessage: Model<IChatMessage> =
  mongoose.models.ChatMessage || mongoose.model<IChatMessage>("ChatMessage", ChatMessageSchema);

export default ChatMessage;
