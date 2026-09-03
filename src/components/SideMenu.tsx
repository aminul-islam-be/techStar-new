"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getCustomerUser,
  logoutCustomer,
  type CustomerUser,
} from "@/lib/customerAuth";

type SideMenuProps = {
  open: boolean;
  onClose: () => void;
};

type MenuLink = {
  icon: string;
  label: string;
  href: string;
};

const mainLinks: MenuLink[] = [
  { icon: "👤", label: "আমার একাউন্ট (My Account)", href: "/account" },
  { icon: "📦", label: "অর্ডার হিস্টরি (Order History)", href: "/orders" },
  { icon: "❤️", label: "উইশলিস্ট (Wishlist)", href: "/wishlist" },
  { icon: "⊞", label: "ক্যাটেগরি (Categories)", href: "/categories" },
  { icon: "🛒", label: "শপিং কার্ট (Cart)", href: "/cart" },
  {
    icon: "🔔",
    label: "নোটিফিকেশনস (Notifications)",
    href: "/notifications",
  },
  {
    icon: "📍",
    label: "ঠিকানা বুক (Saved Addresses)",
    href: "/addresses",
  },
  { icon: "🎧", label: "হেল্প ও সাপোর্ট (Support)", href: "/support" },
  { icon: "⚙️", label: "সেটিংস (Settings)", href: "/settings" },
];

export default function SideMenu({ open, onClose }: SideMenuProps) {
  const router = useRouter();
  const [user, setUser] = useState<CustomerUser | null>(null);

  useEffect(() => {
    if (open) {
      setUser(getCustomerUser());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function handleLogout() {
    logoutCustomer();
    onClose();
    router.push("/");
    router.refresh();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-[80] flex h-full w-[300px] max-w-[85vw] flex-col border-r border-white/10 bg-slate-950 shadow-2xl shadow-black/50 transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
      >
        {/* Header / user card */}
        <div className="border-b border-white/10 bg-gradient-to-br from-blue-600/20 to-indigo-600/10 px-5 pb-5 pt-6">
          <div className="mb-4 flex items-center justify-between">
            <Link
              href="/"
              onClick={onClose}
              className="flex items-center gap-2.5"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-gradient-to-br from-blue-500 to-indigo-600 text-base font-black shadow-lg shadow-blue-600/20">
                T
              </div>
              <span className="text-[17px] font-extrabold tracking-tight text-white">
                TechStar
              </span>
            </Link>

            <button
              onClick={onClose}
              aria-label="Close menu"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>

          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-slate-950">
                {user.fullName?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-white">
                  {user.fullName}
                </div>
                <div className="truncate text-xs text-slate-400">
                  {user.email || user.phone}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                onClick={onClose}
                className="flex-1 rounded-xl bg-white px-4 py-2.5 text-center text-xs font-bold text-slate-950 transition hover:bg-slate-200"
              >
                Sign In
              </Link>
              <Link
                href="/login"
                onClick={onClose}
                className="flex-1 rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2.5 text-center text-xs font-bold text-slate-200 transition hover:bg-white/[0.08]"
              >
                Register
              </Link>
            </div>
          )}
        </div>

        {/* Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="flex flex-col gap-1">
            {mainLinks.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className="flex items-center gap-3.5 rounded-xl px-3 py-3 text-[14px] font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
                >
                  <span className="flex h-5 w-5 items-center justify-center text-base leading-none">
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout */}
        {user && (
          <div className="border-t border-white/10 p-3">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3.5 rounded-xl px-3 py-3 text-left text-[14px] font-bold text-red-400 transition hover:bg-red-500/10"
            >
              <span className="flex h-5 w-5 items-center justify-center text-base leading-none">
                ⏻
              </span>
              লগআউট (Logout)
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
