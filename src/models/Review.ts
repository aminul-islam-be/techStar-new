import mongoose, { Model, Schema, Types } from "mongoose";

export type ReviewStatus = "pending" | "approved" | "rejected";

export interface IReview {
  productId: Types.ObjectId;
  userId: Types.ObjectId;
  vendorId?: Types.ObjectId;
  userName: string;
  userProfilePicture?: string;
  rating: number;
  title?: string;
  comment: string;
  images: string[];
  verifiedPurchase: boolean;
  status: ReviewStatus;
  adminNote?: string;
  sellerReply?: string;
  sellerReplyAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    vendorId: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      index: true,
      default: undefined,
    },

    userName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    userProfilePicture: {
      type: String,
      default: "",
      trim: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    title: {
      type: String,
      default: "",
      trim: true,
      maxlength: 120,
    },

    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1500,
    },

    images: {
      type: [String],
      default: [],
      validate: {
        validator: (items: string[]) => items.length <= 3,
        message: "A review can contain up to 3 images.",
      },
    },

    verifiedPurchase: {
      type: Boolean,
      default: false,
      index: true,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    adminNote: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    sellerReply: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },

    sellerReplyAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// একজন customer একটি product-এ একবার review করতে পারবে
ReviewSchema.index(
  { productId: 1, userId: 1 },
  { unique: true }
);

ReviewSchema.index({
  productId: 1,
  status: 1,
  createdAt: -1,
});

ReviewSchema.index({
  vendorId: 1,
  status: 1,
  createdAt: -1,
});

const Review: Model<IReview> =
  mongoose.models.Review ||
  mongoose.model<IReview>("Review", ReviewSchema);

export default Review;
