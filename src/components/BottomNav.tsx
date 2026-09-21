"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/language";
import { useSeasonTheme } from "@/lib/theme";

type BottomNavProps = { cartCount: number; };

export default function BottomNav({ cartCount }: BottomNavProps) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { seasonInfo } = useSeasonTheme();
  const [isGlossy, setIsGlossy] = useState(false);

  useEffect(() => {
    const checkGlossy = () => setIsGlossy(localStorage.getItem("glossyTheme") === "true");
    checkGlossy();
    window.addEventListener("glossyChange", checkGlossy);
    return () => window.removeEventListener("glossyChange", checkGlossy);
  }, []);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  }

  const tabClass = (href: string) => `flex flex-col items-center gap-1 text-[11px] font-semibold transition ${isActive(href) ? "" : "text-slate-500 hover:text-slate-300"}`;
  const tabStyle = (href: string) => isActive(href) && !isGlossy ? { color: seasonInfo.accent } : undefined;

  // Glossy styles for icons
  const iconClass = (href: string) => `flex h-9 w-9 shrink-0 items-center justify-center text-xl leading-none transition-all duration-500 ${isGlossy ? "rounded-xl bg-white/15 border-[1.5px] border-white/50 backdrop-blur-md shadow-[inset_0_0_10px_rgba(255,255,255,0.2),0_0_15px_rgba(34,197,94,0.4)] text-green-400 scale-110" : ""}`;

  // Glossy styles for center cart
  const cartClass = isGlossy ? "bg-white/15 border-[2px] border-white/50 backdrop-blur-md shadow-[inset_0_0_15px_rgba(255,255,255,0.3),0_0_20px_rgba(34,197,94,0.6)] text-green-400 scale-110" : "border-4 border-slate-950 shadow-2xl hover:brightness-110";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-slate-950/95 backdrop-blur-xl sm:hidden">
      <div className="relative mx-auto flex h-16 max-w-lg items-center justify-between px-6">
        <Link href="/" className={tabClass("/")} style={tabStyle("/")}>
          <span className={iconClass("/")}>🏠</span>
          <span className={`transition-colors ${isGlossy && isActive("/") ? "text-green-400" : ""}`}>{t("nav.home")}</span>
        </Link>

        <Link href="/categories" className={tabClass("/categories")} style={tabStyle("/categories")}>
          <span className={iconClass("/categories")}>⊞</span>
          <span className={`transition-colors ${isGlossy && isActive("/categories") ? "text-green-400" : ""}`}>{t("nav.category")}</span>
        </Link>

        {/* Elevated center cart button */}
        <Link
          href="/cart"
          aria-label="Open Shopping Cart"
          className={`absolute left-1/2 top-0 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xl transition-all duration-500 active:scale-95 ${cartClass}`}
          style={!isGlossy ? { backgroundColor: seasonInfo.accent } : undefined}
        >
          🛒
          {cartCount > 0 && (
            <span
              className={`absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-black transition-colors ${isGlossy ? "bg-green-400 text-slate-950 shadow-[0_0_10px_rgba(34,197,94,1)]" : "bg-white"}`}
              style={!isGlossy ? { color: seasonInfo.accent } : undefined}
            >
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          )}
        </Link>

        <div className="w-10" />

        <Link href="/notifications" className={tabClass("/notifications")} style={tabStyle("/notifications")}>
          <span className={iconClass("/notifications")}>🔔</span>
          <span className={`transition-colors ${isGlossy && isActive("/notifications") ? "text-green-400" : ""}`}>{t("nav.alerts")}</span>
        </Link>

        <Link href="/account" className={tabClass("/account")} style={tabStyle("/account")}>
          <span className={iconClass("/account")}>👤</span>
          <span className={`transition-colors ${isGlossy && isActive("/account") ? "text-green-400" : ""}`}>{t("nav.me")}</span>
        </Link>
      </div>
    </nav>
  );
}
