import mongoose, { Schema, Model } from "mongoose";

export type VendorStatus = "pending" | "approved" | "suspended" | "rejected";

export interface IVendor {
  shopName: string;
  slug: string;
  ownerName: string;
  phone: string;
  email?: string;
  password: string;
  logo?: string;
  address?: string;
  description?: string;
  status: VendorStatus;
  /** null = use the platform default commission rate */
  commissionRate: number | null;
  adminNote?: string;

  // Wallet (all amounts in BDT)
  balance: number; // withdrawable now
  pendingPayout: number; // requested, waiting for admin to pay
  totalSales: number; // gross sales settled
  totalCommission: number; // platform commission taken
  totalEarned: number; // vendor share earned
  totalWithdrawn: number; // already paid out

  payoutMethod?: {
    type: "bkash" | "nagad" | "rocket" | "bank";
    accountName: string;
    accountNumber: string;
    bankName?: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

// A field literally named "type" must live in its own sub-schema, otherwise
// Mongoose mistakes it for the schema type declaration.
const PayoutMethodSchema = new Schema(
  {
    type: { type: String, enum: ["bkash", "nagad", "rocket", "bank"] },
    accountName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    bankName: { type: String, trim: true },
  },
  { _id: false }
);

const VendorSchema = new Schema<IVendor>(
  {
    shopName: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    ownerName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true, default: undefined },
    password: { type: String, required: true },
    logo: { type: String, default: "" },
    address: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["pending", "approved", "suspended", "rejected"],
      default: "pending",
      index: true,
    },
    commissionRate: { type: Number, default: null, min: 0, max: 100 },
    adminNote: { type: String, default: "" },

    balance: { type: Number, default: 0 },
    pendingPayout: { type: Number, default: 0 },
    totalSales: { type: Number, default: 0 },
    totalCommission: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 },
    totalWithdrawn: { type: Number, default: 0 },

    payoutMethod: { type: PayoutMethodSchema, default: undefined },
  },
  { timestamps: true }
);

const Vendor: Model<IVendor> =
  mongoose.models.Vendor || mongoose.model<IVendor>("Vendor", VendorSchema);

export default Vendor;
