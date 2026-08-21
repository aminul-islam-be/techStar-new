import mongoose, { Schema, Model } from "mongoose";

export interface IBanner {
  title?: string;
  type: "image" | "video";
  mediaUrl: string;
  linkUrl?: string;
  order: number;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const BannerSchema = new Schema<IBanner>(
  {
    title: {
      type: String,
      default: "",
      trim: true,
    },
    type: {
      type: String,
      enum: ["image", "video"],
      required: true,
    },
    mediaUrl: {
      type: String,
      required: true,
    },
    linkUrl: {
      type: String,
      default: "",
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Banner: Model<IBanner> =
  mongoose.models.Banner ||
  mongoose.model<IBanner>("Banner", BannerSchema);

export default Banner;
