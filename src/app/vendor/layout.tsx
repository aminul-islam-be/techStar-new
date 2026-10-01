"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { VendorProvider, useVendor, money } from "@/lib/vendorContext";
import VendorLockedOverlay from "@/components/VendorLockedOverlay";
import { nextLockDateLabel } from "@/lib/commissionMath";

const NAV = [
  { href: "/vendor", label: "Dashboard", icon: "📊" },
  { href: "/vendor/products", label: "Products", icon: "📦" },
  { href: "/vendor/orders", label: "Orders", icon: "🛒" },
  { href: "/vendor/messages", label: "Messages", icon: "💬" },
  { href: "/vendor/wallet", label: "Wallet", icon: "💰" },
  { href: "/vendor/billing", label: "Billing", icon: "🧾" },
  { href: "/vendor/profile", label: "Profile", icon: "🏪" },
];

function Shell({ children }: { children: ReactNode }) {
  const { vendor, loading, logout, graceDays } = useVendor();
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage = pathname === "/vendor/login" || pathname === "/vendor/register";

  useEffect(() => {
    if (!loading && !vendor && !isAuthPage) router.replace("/vendor/login");
  }, [loading, vendor, isAuthPage, router]);

  if (isAuthPage) return <>{children}</>;

  if (loading || !vendor) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">Loading...</main>
    );
  }

  // Unpaid commission: nothing of the panel is shown, only the payment screen.
  if (vendor.billingLocked) {
    return (
      <main className="min-h-screen bg-slate-950">
        <VendorLockedOverlay
          due={vendor.dueCommission ?? 0}
          onLogout={async () => {
            await logout();
            router.replace("/vendor/login");
          }}
        />
      </main>
    );
  }

  const due = vendor.dueCommission ?? 0;

  return (
    <div className="min-h-screen bg-slate-950 pb-24 text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold">{vendor.shopName}</p>
            <p className="text-[11px] text-slate-400">Vendor Panel</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300">
              Store
            </Link>
            <button
              onClick={async () => {
                await logout();
                router.replace("/vendor/login");
              }}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300"
            >
              Logout
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-3 pb-2">
          {NAV.map((item) => {
            const active = item.href === "/vendor" ? pathname === "/vendor" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold ${
                  active ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-white/5"
                }`}
              >
                {item.icon} {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {vendor.status === "pending" && (
        <div className="mx-auto mt-4 max-w-5xl px-4">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
            ⏳ Your shop is waiting for admin approval. You can set up your profile now; adding products and
            withdrawals unlock after approval.
          </div>
        </div>
      )}

      {due > 0 && (
        <div className="mx-auto mt-4 max-w-5xl px-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            <span>
              🧾 COD commission due: <b>{money(due)}</b>. Pay before <b>{nextLockDateLabel(graceDays)}</b>, otherwise your shop
              will be locked.
            </span>
            <Link href="/vendor/billing" className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white">
              Pay now
            </Link>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-5xl px-4 py-5">{children}</div>
    </div>
  );
}

export default function VendorLayout({ children }: { children: ReactNode }) {
  return (
    <VendorProvider>
      <Shell>{children}</Shell>
    </VendorProvider>
  );
}
