import mongoose, { Schema, Document, Model } from "mongoose";

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  // "product" is the old type, kept so existing rows keep working
  type: "order" | "product" | "offer" | "stock";
  icon?: string;
  link?: string;
  linkId?: string;
  // same key = same notification (stops duplicates when a status is set twice)
  dedupeKey?: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ["order", "product", "offer", "stock"],
      required: true,
    },
    icon: { type: String },
    link: { type: String },
    linkId: { type: String },
    dedupeKey: { type: String },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1 });
NotificationSchema.index(
  { userId: 1, dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $type: "string" } } }
);
// notifications older than 90 days are removed automatically
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export default (mongoose.models.Notification as Model<INotification>) ||
  mongoose.model<INotification>("Notification", NotificationSchema);
