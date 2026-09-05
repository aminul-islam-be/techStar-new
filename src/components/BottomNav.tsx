"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/language";

type BottomNavProps = {
  cartCount: number;
};

export default function BottomNav({ cartCount }: BottomNavProps) {
  const pathname = usePathname();
  const { t } = useLanguage();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  }

  const tabClass = (href: string) =>
    `flex flex-col items-center gap-1 text-[11px] font-semibold transition ${
      isActive(href)
        ? "text-blue-400"
        : "text-slate-500 hover:text-slate-300"
    }`;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-slate-950/95 backdrop-blur-xl sm:hidden">
      <div className="relative mx-auto flex h-16 max-w-lg items-center justify-between px-6">
        <Link href="/" className={tabClass("/")}>
          <span className="text-xl leading-none">🏠</span>
          {t("nav.home")}
        </Link>

        <Link href="/categories" className={tabClass("/categories")}>
          <span className="text-xl leading-none">⊞</span>
          {t("nav.category")}
        </Link>

        {/* Elevated center cart button */}
        <Link
          href="/cart"
          aria-label="Open Shopping Cart"
          className="absolute left-1/2 top-0 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-slate-950 bg-blue-600 text-xl shadow-2xl shadow-blue-600/30 transition hover:bg-blue-500 active:scale-95"
        >
          🛒
          {cartCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-black text-blue-600">
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          )}
        </Link>

        {/* Spacer under the floating cart button */}
        <div className="w-10" />

        <Link href="/notifications" className={tabClass("/notifications")}>
          <span className="text-xl leading-none">🔔</span>
          {t("nav.alerts")}
        </Link>

        <Link href="/account" className={tabClass("/account")}>
          <span className="text-xl leading-none">👤</span>
          {t("nav.me")}
        </Link>
      </div>
    </nav>
  );
}
