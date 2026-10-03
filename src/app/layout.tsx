import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/language";
import { ThemeProvider } from "@/lib/theme";
import RouteProgressBar from "@/components/RouteProgressBar";
import { SiteProvider } from "@/lib/siteContext";
import { getSiteSettings } from "@/lib/siteSettings";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Pages are rebuilt at most once a minute. Saving the website settings
// clears them immediately (see /api/admin/site-settings).
export const revalidate = 60;

// The browser title, search-engine text, icon and app name all come from the admin settings.
export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();
  const icon = site.faviconUrl || site.logoUrl || "/icon.svg";

  return {
    title: site.tagline ? `${site.siteName} - ${site.tagline}` : site.siteName,
    description: site.description,
    manifest: "/manifest.json",
    icons: {
      icon,
      apple: site.logoUrl || icon,
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: site.siteName,
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const site = await getSiteSettings();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <RouteProgressBar />
        <SiteProvider initial={site}>
          <LanguageProvider>
            <ThemeProvider>{children}</ThemeProvider>
          </LanguageProvider>
        </SiteProvider>
      </body>
    </html>
  );
}
