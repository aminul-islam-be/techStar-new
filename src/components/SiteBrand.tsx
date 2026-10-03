"use client";

import { useSite } from "@/lib/siteContext";
import type { SiteSettings } from "@/lib/siteDefaults";

/** Prints one setting as plain text, e.g. <SiteValue field="tagline" /> */
export function SiteValue({ field }: { field: keyof SiteSettings }) {
  const site = useSite();
  return <>{site[field]}</>;
}

/** The website name. Use this instead of typing the name in a page. */
export function SiteName() {
  return <SiteValue field="siteName" />;
}

/**
 * The logo: the uploaded image if there is one, otherwise the first letter of
 * the name inside the original coloured box (`fallbackClassName`).
 */
export function SiteLogo({ fallbackClassName, imgClassName }: { fallbackClassName: string; imgClassName: string }) {
  const site = useSite();

  if (site.logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={site.logoUrl} alt={site.siteName} className={imgClassName} />;
  }
  return <div className={fallbackClassName}>{site.siteName.trim().charAt(0).toUpperCase() || "S"}</div>;
}

/** Small "email · phone · Facebook" line for footers. Shows only what the admin filled in. */
export function SiteContactLine() {
  const site = useSite();
  const phoneLink = site.supportPhone.replace(/[^+\d]/g, "");

  if (!site.supportEmail && !site.supportPhone && !site.facebookUrl) return null;

  return (
    <p className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-slate-500 sm:justify-end">
      {site.supportEmail && (
        <a href={`mailto:${site.supportEmail}`} className="hover:text-slate-300">
          {site.supportEmail}
        </a>
      )}
      {site.supportPhone && (
        <a href={`tel:${phoneLink}`} className="hover:text-slate-300">
          {site.supportPhone}
        </a>
      )}
      {site.facebookUrl && (
        <a href={site.facebookUrl} target="_blank" rel="noopener noreferrer" className="hover:text-slate-300">
          Facebook
        </a>
      )}
    </p>
  );
}
