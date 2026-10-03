/**
 * Website-wide settings (name, logo, contact info). These are the values used
 * until the admin saves something different in Admin -> Website settings.
 * No database in this file, so it is safe to use in the browser too.
 */

export const DEFAULT_SITE_NAME = "TechStar";

export type SiteSettings = {
  siteName: string;
  tagline: string;
  description: string; // used for search engines (SEO)
  logoUrl: string; // empty = show the first letter of the name instead
  faviconUrl: string; // browser tab icon, empty = use the logo
  supportEmail: string;
  supportPhone: string;
  address: string;
  facebookUrl: string;
};

export const DEFAULT_SITE: SiteSettings = {
  siteName: DEFAULT_SITE_NAME,
  tagline: "Smart Marketplace",
  description: "Electrical, electronics, automation and technology marketplace.",
  logoUrl: "",
  faviconUrl: "",
  supportEmail: "support@techstar.com",
  supportPhone: "01922964696",
  address: "Level 4, Block B, Tech Park\nDhaka, Bangladesh",
  facebookUrl: "",
};

export const SITE_FIELDS = Object.keys(DEFAULT_SITE) as (keyof SiteSettings)[];

const safeUrl = (v: string) => v === "" || /^https?:\/\//i.test(v) || v.startsWith("/");

/** Checks and cleans what the admin typed. */
export function validateSiteInput(body: Record<string, unknown>): { ok: boolean; message?: string; data?: SiteSettings } {
  const get = (k: keyof SiteSettings) => String(body[k] ?? "").trim();

  const data: SiteSettings = {
    siteName: get("siteName"),
    tagline: get("tagline"),
    description: get("description"),
    logoUrl: get("logoUrl"),
    faviconUrl: get("faviconUrl"),
    supportEmail: get("supportEmail"),
    supportPhone: get("supportPhone"),
    address: String(body.address ?? "").trim(),
    facebookUrl: get("facebookUrl"),
  };

  if (!data.siteName) return { ok: false, message: "Website name is required." };
  if (data.siteName.length > 60) return { ok: false, message: "Website name must be 60 characters or less." };
  if (data.tagline.length > 100) return { ok: false, message: "Tagline must be 100 characters or less." };
  if (data.description.length > 300) return { ok: false, message: "Description must be 300 characters or less." };
  if (data.address.length > 300) return { ok: false, message: "Address must be 300 characters or less." };

  for (const [label, value] of [["Logo", data.logoUrl], ["Favicon", data.faviconUrl], ["Facebook page", data.facebookUrl]] as const) {
    if (value.length > 500 || !safeUrl(value)) return { ok: false, message: `${label} link must start with https:// (or /).` };
  }
  if (data.supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.supportEmail)) {
    return { ok: false, message: "Support email is not valid." };
  }
  if (data.supportPhone && !/^[0-9+\-\s()]{5,30}$/.test(data.supportPhone)) {
    return { ok: false, message: "Support phone can only have digits, spaces, + and -." };
  }

  return { ok: true, data };
}
