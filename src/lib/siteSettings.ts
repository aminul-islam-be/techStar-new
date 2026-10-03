import { unstable_cache } from "next/cache";
import connectDB from "@/lib/mongodb";
import SiteSettingsModel from "@/models/SiteSettings";
import { DEFAULT_SITE, SITE_FIELDS, type SiteSettings } from "@/lib/siteDefaults";

export const SITE_SETTINGS_TAG = "site-settings";

/** Reads the settings straight from the database (always fresh). */
export async function readSiteSettingsFromDb(): Promise<SiteSettings> {
  await connectDB();
  const doc = (await SiteSettingsModel.findOne({ key: "main" }).lean()) as Record<string, unknown> | null;

  const out = { ...DEFAULT_SITE };
  if (doc) {
    for (const field of SITE_FIELDS) {
      if (typeof doc[field] === "string") out[field] = doc[field] as string;
    }
  }
  return out;
}

// Cached so the whole site does not hit the database on every page view.
// Saving the settings clears this cache (see /api/admin/site-settings).
const cached = unstable_cache(readSiteSettingsFromDb, ["site-settings-v1"], {
  tags: [SITE_SETTINGS_TAG],
  revalidate: 300,
});

/**
 * Use this on the server (layouts, API routes). Never throws and never hangs:
 * if the database is slow or down, the original defaults are used for that request.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const fallback = new Promise<SiteSettings>((resolve) => {
    timer = setTimeout(() => resolve(DEFAULT_SITE), 4000);
  });

  try {
    return await Promise.race([cached(), fallback]);
  } catch (error) {
    console.error("Could not load site settings, using defaults:", error);
    return DEFAULT_SITE;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
