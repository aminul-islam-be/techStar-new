import mongoose, { Schema, Model } from "mongoose";

export interface IProduct {
  name: string;
    slug: string;
      category: string;
        description: string;
          price: number;
            currency: string;
              image?: string;
                stock: number;
                  featured: boolean;
                    active: boolean;
                      createdAt?: Date;
                        updatedAt?: Date;
                        }

                        const ProductSchema = new Schema<IProduct>(
                          {
                              name: {
                                    type: String,
                                          required: true,
                                                trim: true,
                                                    },
                                                        slug: {
                                                              type: String,
                                                                    required: true,
                                                                          unique: true,
                                                                                trim: true,
                                                                                      lowercase: true,
                                                                                          },
                                                                                              category: {
                                                                                                    type: String,
                                                                                                          required: true,
                                                                                                                trim: true,
                                                                                                                    },
                                                                                                                        description: {
                                                                                                                              type: String,
                                                                                                                                    default: "",
                                                                                                                                          trim: true,
                                                                                                                                              },
                                                                                                                                                  price: {
                                                                                                                                                        type: Number,
                                                                                                                                                              required: true,
                                                                                                                                                                    min: 0,
                                                                                                                                                                        },
                                                                                                                                                                            currency: {
                                                                                                                                                                                  type: String,
                                                                                                                                                                                        default: "USD",
                                                                                                                                                                                              uppercase: true,
                                                                                                                                                                                                  },
                                                                                                                                                                                                      image: {
                                                                                                                                                                                                            type: String,
                                                                                                                                                                                                                  default: "",
                                                                                                                                                                                                                      },
                                                                                                                                                                                                                          stock: {
                                                                                                                                                                                                                                type: Number,
                                                                                                                                                                                                                                      default: 0,
                                                                                                                                                                                                                                            min: 0,
                                                                                                                                                                                                                                                },
                                                                                                                                                                                                                                                    featured: {
                                                                                                                                                                                                                                                          type: Boolean,
                                                                                                                                                                                                                                                                default: false,
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

                                                                                                                                                                                                                                                                                                  const Product: Model<IProduct> =
                                                                                                                                                                                                                                                                                                    mongoose.models.Product ||
                                                                                                                                                                                                                                                                                                      mongoose.model<IProduct>("Product", ProductSchema);

                                                                                                                                                                                                                                                                                                      export default Product;
                                                                                                                                                                                                                                                                                                      