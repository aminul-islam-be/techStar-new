import { NextResponse } from "next/server";
import { getSiteSettings } from "@/lib/siteSettings";

export const dynamic = "force-dynamic";

/** The "install this website as an app" file. The name and icon follow the admin settings. */
export async function GET() {
  const site = await getSiteSettings();
  const icon = site.logoUrl || site.faviconUrl || "/icon.svg";
  const isSvg = icon.toLowerCase().includes(".svg");

  const icons = ["any", "maskable"].map((purpose) => ({
    src: icon,
    sizes: "any",
    ...(isSvg ? { type: "image/svg+xml" } : {}),
    purpose,
  }));

  return NextResponse.json(
    {
      name: site.tagline ? `${site.siteName} - ${site.tagline}` : site.siteName,
      short_name: site.siteName.slice(0, 12),
      description: site.description,
      start_url: "/",
      scope: "/",
      display: "standalone",
      orientation: "portrait",
      background_color: "#020617",
      theme_color: "#020617",
      icons,
    },
    { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "no-cache" } }
  );
}
