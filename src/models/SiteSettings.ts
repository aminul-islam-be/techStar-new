import mongoose, { Schema, Model } from "mongoose";
import { DEFAULT_SITE, type SiteSettings } from "@/lib/siteDefaults";

/** One document (key "main") holds all website-wide settings. */
export type ISiteSettings = SiteSettings & { key: string };

const SiteSettingsSchema = new Schema<ISiteSettings>(
  {
    key: { type: String, default: "main", unique: true },
    siteName: { type: String, default: DEFAULT_SITE.siteName, trim: true },
    tagline: { type: String, default: DEFAULT_SITE.tagline, trim: true },
    description: { type: String, default: DEFAULT_SITE.description, trim: true },
    logoUrl: { type: String, default: DEFAULT_SITE.logoUrl, trim: true },
    faviconUrl: { type: String, default: DEFAULT_SITE.faviconUrl, trim: true },
    supportEmail: { type: String, default: DEFAULT_SITE.supportEmail, trim: true },
    supportPhone: { type: String, default: DEFAULT_SITE.supportPhone, trim: true },
    address: { type: String, default: DEFAULT_SITE.address, trim: true },
    facebookUrl: { type: String, default: DEFAULT_SITE.facebookUrl, trim: true },
  },
  { timestamps: true }
);

const SiteSettingsModel: Model<ISiteSettings> =
  mongoose.models.SiteSettings || mongoose.model<ISiteSettings>("SiteSettings", SiteSettingsSchema);

export default SiteSettingsModel;
