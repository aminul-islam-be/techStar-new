import mongoose, { Schema, Document, Model } from "mongoose";

export interface IHistory extends Document {
  userId: mongoose.Types.ObjectId;
  type: "viewed" | "search";
  productId?: mongoose.Types.ObjectId;
  query?: string;
  queryKey?: string;
  at: Date;
  expiresAt: Date;
}

const HistorySchema = new Schema<IHistory>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ["viewed", "search"],
    required: true,
  },
  productId: {
    type: Schema.Types.ObjectId,
    ref: "Product",
  },
  query: {
    type: String,
    trim: true,
  },
  queryKey: {
    type: String,
    trim: true,
    lowercase: true,
  },
  at: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
});

// TTL index: MongoDB automatically deletes a document once its
// expiresAt timestamp is in the past. No cron job needed.
HistorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

HistorySchema.index({ userId: 1, type: 1, productId: 1 });
HistorySchema.index({ userId: 1, type: 1, queryKey: 1 });

const History: Model<IHistory> =
  mongoose.models.History ||
  mongoose.model<IHistory>("History", HistorySchema);

export default History;
