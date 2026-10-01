import mongoose, { Schema, Model } from "mongoose";

export interface IMarketplaceSettings {
  key: string;
  defaultCommissionRate: number; // % taken by the platform
  minWithdrawal: number; // BDT
  autoApproveVendors: boolean;
  autoApproveProducts: boolean;
  commissionGraceDays: number; // days after the 1st before unpaid vendors are locked
  lastLockRunMonth?: string; // "YYYY-MM" of the last automatic lock run
  lastLockRunAt?: Date;
}

const MarketplaceSettingsSchema = new Schema<IMarketplaceSettings>(
  {
    key: { type: String, default: "main", unique: true },
    defaultCommissionRate: { type: Number, default: 10, min: 0, max: 100 },
    minWithdrawal: { type: Number, default: 500, min: 0 },
    autoApproveVendors: { type: Boolean, default: false },
    autoApproveProducts: { type: Boolean, default: false },
    commissionGraceDays: { type: Number, default: 0, min: 0, max: 10 },
    lastLockRunMonth: { type: String, default: "" },
    lastLockRunAt: { type: Date },
  },
  { timestamps: true }
);

const MarketplaceSettings: Model<IMarketplaceSettings> =
  mongoose.models.MarketplaceSettings ||
  mongoose.model<IMarketplaceSettings>("MarketplaceSettings", MarketplaceSettingsSchema);

export default MarketplaceSettings;
