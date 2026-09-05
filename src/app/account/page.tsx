"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCustomerUser, type CustomerUser } from "@/lib/customerAuth";
import { useLanguage } from "@/lib/language";

type Order = {
  _id: string;
  status?: string;
};

export default function AccountPage() {
  const { t } = useLanguage();
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const statusTabs: {
    key: string;
    label: string;
    icon: string;
  }[] = [
    { key: "pending", label: t("orders.status.pending"), icon: "💳" },
    { key: "processing", label: t("orders.status.processing"), icon: "📦" },
    { key: "shipped", label: t("orders.status.shipped"), icon: "🚚" },
    { key: "delivered", label: t("orders.status.delivered"), icon: "✅" },
  ];

  const quickLinks: {
    icon: string;
    label: string;
    href: string;
  }[] = [
    { icon: "❤️", label: t("menu.wishlist"), href: "/wishlist" },
    {
      icon: "📍",
      label: t("account.shippingAddress"),
      href: "/addresses",
    },
    { icon: "🎟️", label: t("account.coupons"), href: "/coupons" },
    {
      icon: "💳",
      label: t("account.paymentMethods"),
      href: "/payment-methods",
    },
  ];

  useEffect(() => {
    const current = getCustomerUser();

    if (!current) {
      window.location.href = "/login";
      return;
    }

    setUser(current);
    loadOrders(current.id);
  }, []);

  async function loadOrders(userId: string) {
    try {
      setLoading(true);

      const response = await fetch("/api/orders", {
        method: "GET",
        headers: { "x-user-id": userId },
        cache: "no-store",
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setOrders(
          Array.isArray(data.orders) ? data.orders : []
        );
      }
    } catch {
      // Silently ignore — counts just show 0.
    } finally {
      setLoading(false);
    }
  }

  function countByStatus(status: string) {
    if (status === "pending") {
      return orders.filter(
        (o) => !o.status || o.status === "pending"
      ).length;
    }

    return orders.filter((o) => o.status === status).length;
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-gradient-to-br from-blue-600/20 to-indigo-600/10 px-4 pb-8 pt-6 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link
            href="/"
            aria-label="Back"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            {"←"}
          </Link>

          <h1 className="text-lg font-bold">{t("account.title")}</h1>

          <Link
            href="/settings"
            aria-label="Settings"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            ⚙️
          </Link>
        </div>

        <div className="mx-auto mt-6 flex max-w-3xl items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white text-2xl font-black text-slate-950">
            {user.fullName?.charAt(0)?.toUpperCase() || "U"}
          </div>

          <div className="min-w-0">
            <div className="truncate text-xl font-extrabold text-white">
              {user.fullName}
            </div>
            <div className="truncate text-sm text-slate-300">
              {user.phone || user.email}
            </div>

            <Link
              href="/profile"
              className="mt-1 inline-block text-xs font-semibold text-blue-300 hover:text-blue-200"
            >
              {t("account.editProfile")}
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        {/* Order status row */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm font-bold text-white">
              {t("account.myOrders")}
            </div>

            <Link
              href="/orders"
              className="text-xs font-semibold text-blue-300 hover:text-blue-200"
            >
              {t("common.viewAll")}
            </Link>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {statusTabs.map((tab) => (
              <Link
                key={tab.key}
                href="/orders"
                className="flex flex-col items-center gap-2 rounded-xl px-1 py-2 text-center transition hover:bg-white/[0.06]"
              >
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-lg">
                  {tab.icon}
                  {!loading && countByStatus(tab.key) > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-black text-white">
                      {countByStatus(tab.key)}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-medium text-slate-300">
                  {tab.label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div className="mt-4 divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between px-5 py-4 transition hover:bg-white/[0.06]"
            >
              <div className="flex items-center gap-3.5">
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm font-medium text-slate-200">
                  {item.label}
                </span>
              </div>
              <span className="text-slate-500">›</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
