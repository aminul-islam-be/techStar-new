import mongoose, { Schema, Document, Model } from "mongoose";

export interface IWishlist extends Document {
  userId: mongoose.Types.ObjectId;
  productIds: mongoose.Types.ObjectId[];
  updatedAt: Date;
  createdAt: Date;
}

const WishlistSchema = new Schema<IWishlist>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    productIds: {
      type: [Schema.Types.ObjectId],
      ref: "Product",
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const Wishlist: Model<IWishlist> =
  mongoose.models.Wishlist ||
  mongoose.model<IWishlist>("Wishlist", WishlistSchema);

export default Wishlist;
