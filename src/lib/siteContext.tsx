"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { DEFAULT_SITE, type SiteSettings } from "@/lib/siteDefaults";

type Ctx = { site: SiteSettings; refresh: () => Promise<void> };

const SiteContext = createContext<Ctx>({ site: DEFAULT_SITE, refresh: async () => {} });

/**
 * Gives every component the website name, logo and contact info.
 * The first values come from the server, so there is no flash of old text.
 * After the admin saves, refresh() makes the whole site update without a reload.
 */
export function SiteProvider({ initial, children }: { initial: SiteSettings; children: ReactNode }) {
  const [site, setSite] = useState<SiteSettings>(initial);
  const previousName = useRef(initial.siteName);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/site-settings", { cache: "no-store" });
      const data = await res.json();
      if (data.success && data.site) setSite(data.site);
    } catch {
      /* keep what we have */
    }
  }, []);

  // pick up changes made by the admin: when the visitor comes back to the tab, and every 5 minutes
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(refresh, 5 * 60 * 1000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, [refresh]);

  // the browser tab title follows a name change too
  useEffect(() => {
    const old = previousName.current;
    if (old !== site.siteName) {
      document.title = document.title.split(old).join(site.siteName);
      previousName.current = site.siteName;
    }
  }, [site.siteName]);

  return <SiteContext.Provider value={{ site, refresh }}>{children}</SiteContext.Provider>;
}

/** The current website settings. */
export const useSite = () => useContext(SiteContext).site;

/** Re-reads the settings from the server (the admin settings page calls this after saving). */
export const useSiteRefresh = () => useContext(SiteContext).refresh;
