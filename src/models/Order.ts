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

export interface IShipmentItem {
  productId: mongoose.Types.ObjectId;
  name: string;
  quantity: number;
}

export interface IShipment {
  _id?: mongoose.Types.ObjectId;
  items: IShipmentItem[];
  courierName?: string;
  trackingNumber?: string;
  status: "preparing" | "shipped" | "delivered";
  shippedAt?: Date;
  deliveredAt?: Date;
  createdAt?: Date;
}

export interface IManualPayment {
  method: "bkash" | "nagad" | "rocket";
  senderNumber: string;
  trxId: string;
  status: "submitted" | "verified" | "rejected";
  submittedAt?: Date;
  verifiedAt?: Date;
  adminNote?: string;
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
  cancelReason?: string;
  cancelledBy?: "customer" | "admin";
  // online payment: every SSLCommerz attempt (tran_id) of this order
  paymentTranIds?: string[];
  paymentValId?: string;
  bankTranId?: string;
  paidAt?: Date;
  // true while the order holds product stock; stockReleasedAt is set once it is given back
  stockReserved?: boolean;
  stockReleasedAt?: Date;
  returnedAt?: Date;
  deliveredAt?: Date;
  deliveryInstructions?: string;
  estimatedDeliveryDate?: Date;
  shipments?: IShipment[];
  manualPayment?: IManualPayment;

  vendorSettledAt?: Date;
  vendorReversedAt?: Date;
  itemsTotal?: number;
  courierTotal?: number;
  shippingZone?: "dhaka" | "outside";
  couponCode?: string;
  discountAmount?: number;
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

const ShipmentItemSchema = new Schema<IShipmentItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const ShipmentSchema = new Schema<IShipment>(
  {
    items: { type: [ShipmentItemSchema], required: true },
    courierName: { type: String, trim: true, maxlength: 60 },
    trackingNumber: { type: String, trim: true, maxlength: 60 },
    status: { type: String, enum: ["preparing", "shipped", "delivered"], default: "preparing" },
    shippedAt: { type: Date },
    deliveredAt: { type: Date },
    createdAt: { type: Date, default: () => new Date() },
  },
  { _id: true }
);

const ManualPaymentSchema = new Schema<IManualPayment>(
  {
    method: { type: String, enum: ["bkash", "nagad", "rocket"], required: true },
    senderNumber: { type: String, required: true, trim: true, maxlength: 20 },
    trxId: { type: String, required: true, trim: true, uppercase: true, maxlength: 30 },
    status: { type: String, enum: ["submitted", "verified", "rejected"], default: "submitted" },
    submittedAt: { type: Date },
    verifiedAt: { type: Date },
    adminNote: { type: String, trim: true, maxlength: 200 },
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

    cancelReason: { type: String, trim: true, maxlength: 200 },
    cancelledBy: { type: String, enum: ["customer", "admin"] },
    paymentTranIds: { type: [String], index: true },
    paymentValId: { type: String },
    bankTranId: { type: String },
    paidAt: { type: Date },
    stockReserved: { type: Boolean, default: false },
    stockReleasedAt: { type: Date },
    returnedAt: { type: Date },

    deliveredAt: {
      type: Date,
    },

    deliveryInstructions: { type: String, trim: true, maxlength: 300 },
    estimatedDeliveryDate: { type: Date },
    shipments: { type: [ShipmentSchema], default: [] },
    manualPayment: { type: ManualPaymentSchema },

    vendorSettledAt: {
      type: Date,
    },

    vendorReversedAt: {
      type: Date,
    },

    itemsTotal: { type: Number, min: 0 },
    courierTotal: { type: Number, min: 0 },
    shippingZone: { type: String, enum: ["dhaka", "outside"] },
    couponCode: { type: String },
    discountAmount: { type: Number, default: 0, min: 0 },

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

OrderSchema.index({ "manualPayment.trxId": 1 });

const Order: Model<IOrder> =
  mongoose.models.Order ||
  mongoose.model<IOrder>("Order", OrderSchema);

export default Order;

