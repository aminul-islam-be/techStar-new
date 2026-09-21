"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getCustomerUser,
  logoutCustomer,
  saveCustomerUser,
  type CustomerUser,
} from "@/lib/customerAuth";
import { useLanguage } from "@/lib/language";

type SideMenuProps = { open: boolean; onClose: () => void; };

export default function SideMenu({ open, onClose }: SideMenuProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [isGlossy, setIsGlossy] = useState(false); useEffect(() => { setIsGlossy(localStorage.getItem("glossyTheme") === "true"); }, []); const toggleGlossy = () => { const val = !isGlossy; setIsGlossy(val); localStorage.setItem("glossyTheme", val.toString()); window.dispatchEvent(new Event("glossyChange")); }; // Glossy state added

  const mainLinks = [
    { icon: "👤", label: t("menu.myAccount"), href: "/account" },
    { icon: "🤖", label: t("menu.aiAssistant"), href: "/ai" },
    { icon: "📦", label: t("menu.orderHistory"), href: "/orders" },
    { icon: "🕘", label: t("menu.myHistory"), href: "/history" },
    { icon: "❤️", label: t("menu.wishlist"), href: "/wishlist" },
    { icon: "⊞", label: t("menu.categories"), href: "/categories" },
    { icon: "🧪", label: t("menu.productDetails"), href: "/product-details" },
    { icon: "🛒", label: t("menu.cart"), href: "/cart" },
    { icon: "🔔", label: t("menu.notifications"), href: "/notifications" },
    { icon: "📍", label: t("menu.addresses"), href: "/addresses" },
    { icon: "🎧", label: t("menu.support"), href: "/support" },
    { icon: "⚙️", label: t("menu.settings"), href: "/settings" },
  ];

  useEffect(() => {
    if (!open) return;
    const current = getCustomerUser();
    setUser(current);
    if (!current) return;

    fetch("/api/profile", { method: "GET", headers: { "x-user-id": current.id }, cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data.user?.profilePicture !== current.profilePicture) {
          const updated = { ...current, profilePicture: data.user?.profilePicture || "" };
          saveCustomerUser(updated);
          setUser(updated);
        }
      })
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  function handleLogout() {
    logoutCustomer(); onClose(); router.push("/"); router.refresh();
  }

  return (
    <>
      <div onClick={onClose} className={`fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`} aria-hidden="true" />

      <aside className={`fixed inset-y-0 left-0 z-[80] flex h-full w-[300px] max-w-[85vw] flex-col border-r border-white/10 bg-slate-950 shadow-2xl shadow-black/50 transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"}`} role="dialog" aria-modal="true" aria-label="Menu">
        <div className="border-b border-white/10 bg-gradient-to-br from-blue-600/20 to-indigo-600/10 px-5 pb-5 pt-6">
          <div className="mb-4 flex items-center justify-between">
            <Link href="/" onClick={onClose} className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-gradient-to-br from-blue-500 to-indigo-600 text-base font-black shadow-lg shadow-blue-600/20">T</div>
              <span className="text-[17px] font-extrabold tracking-tight text-white">TechStar</span>
            </Link>
            <button onClick={onClose} aria-label="Close menu" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white">✕</button>
          </div>
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-sm font-black text-slate-950">
                {user.profilePicture ? <img src={user.profilePicture} alt={user.fullName || "Profile"} className="h-full w-full object-cover" /> : (user.fullName?.charAt(0)?.toUpperCase() || "U")}
              </div>
              <div className="min-w-0"><div className="truncate text-sm font-bold text-white">{user.fullName}</div><div className="truncate text-xs text-slate-400">{user.email || user.phone}</div></div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" onClick={onClose} className="flex-1 rounded-xl bg-white px-4 py-2.5 text-center text-xs font-bold text-slate-950 transition hover:bg-slate-200">{t("menu.signIn")}</Link>
              <Link href="/login" onClick={onClose} className="flex-1 rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2.5 text-center text-xs font-bold text-slate-200 transition hover:bg-white/[0.08]">{t("menu.register")}</Link>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="flex flex-col gap-1">
            {mainLinks.map((item) => (
              <li key={item.href}>
                <Link href={item.href} onClick={onClose} className="flex items-center gap-4 rounded-xl px-3 py-3 text-[14px] font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center text-lg leading-none transition-all duration-500 ${isGlossy ? "rounded-xl bg-white/15 border-[1.5px] border-white/50 shadow-[inset_0_0_10px_rgba(255,255,255,0.2)] backdrop-blur-md shadow-[0_0_18px_rgba(34,197,94,0.4)] text-green-400 scale-110" : "rounded-lg"}`}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-white/10 px-4 py-4 space-y-4">
          {/* Glossy Toggle Switch */}
          <div className="flex items-center justify-between rounded-xl bg-white/[0.02] border border-white/5 p-3">
            <span className="text-[14px] font-bold text-slate-300 flex items-center gap-2">
              <span className={isGlossy ? "animate-pulse" : ""}>✨</span> Glossy Icons
            </span>
            <button onClick={toggleGlossy} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${isGlossy ? "bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.5)]" : "bg-slate-700"}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${isGlossy ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          {user && (
            <button onClick={handleLogout} className="flex w-full items-center gap-4 rounded-xl px-2 py-3 text-left text-[14px] font-bold text-red-400 transition hover:bg-red-500/10 hover:text-red-300">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center text-lg leading-none transition-all duration-500 ${isGlossy ? "rounded-xl bg-red-500/20 border-[1.5px] border-red-400/50 shadow-[inset_0_0_10px_rgba(255,255,255,0.1)] backdrop-blur-md shadow-[0_0_18px_rgba(239,68,68,0.4)] scale-110" : "rounded-lg"}`}>
                ⏻
              </span>
              {t("menu.logout")}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
