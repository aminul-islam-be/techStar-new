import "@/models/User"; // registers the User model, so .populate("userId") works in every route
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  // Marketplace split (snapshotted when the order is placed)
  vendorId?: mongoose.Types.ObjectId;
  commissionRate?: number;
  commissionAmount?: number;
  vendorEarning?: number;
  courierCharge?: number;
}

export interface IOrder extends Document {
  userId: mongoose.Types.ObjectId;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;

  items: IOrderItem[];

  totalAmount: number;
  currency: string;

  paymentMethod: string;
  paymentStatus: "pending" | "paid" | "failed";

  status:
    | "pending"
    | "confirmed"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled";

  deliveryAddress: {
    fullName: string;
    phone: string;
    address: string;
    city?: string;
    area?: string;
  };

  cancelledAt?: Date;
  deliveredAt?: Date;

  vendorSettledAt?: Date;
  vendorReversedAt?: Date;
  itemsTotal?: number;
  courierTotal?: number;
  shippingZone?: "dhaka" | "outside";
  codCommissionAccruedAt?: Date;
  codCommissionReversedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}
const OrderItemSchema = new Schema<IOrderItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    image: {
      type: String,
      trim: true,
    },
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      index: true,
    },
    commissionRate: { type: Number, min: 0, max: 100 },
    commissionAmount: { type: Number, min: 0 },
    vendorEarning: { type: Number, min: 0 },
    courierCharge: { type: Number, min: 0 },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    customerName: {
      type: String,
      required: true,
      trim: true,
    },

    customerPhone: {
      type: String,
      required: true,
      trim: true,
    },

    customerEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },

    items: {
      type: [OrderItemSchema],
      required: true,
      validate: {
        validator: (items: IOrderItem[]) => items.length > 0,
        message: "Order must contain at least one product.",
      },
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "BDT",
      trim: true,
      uppercase: true,
    },

    paymentMethod: {
      type: String,
      default: "manual",
      trim: true,
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },

    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      default: "pending",
      index: true,
    },

    deliveryAddress: {
      fullName: {
        type: String,
        required: true,
        trim: true,
      },
      phone: {
        type: String,
        required: true,
        trim: true,
      },
      address: {
        type: String,
        required: true,
        trim: true,
      },
      city: {
        type: String,
        trim: true,
      },
      area: {
        type: String,
        trim: true,
      },
    },

    cancelledAt: {
      type: Date,
    },

    deliveredAt: {
      type: Date,
    },

    vendorSettledAt: {
      type: Date,
    },

    vendorReversedAt: {
      type: Date,
    },

    itemsTotal: { type: Number, min: 0 },
    courierTotal: { type: Number, min: 0 },
    shippingZone: { type: String, enum: ["dhaka", "outside"] },

    codCommissionAccruedAt: {
      type: Date,
    },

    codCommissionReversedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const Order: Model<IOrder> =
  mongoose.models.Order ||
  mongoose.model<IOrder>("Order", OrderSchema);

export default Order;

