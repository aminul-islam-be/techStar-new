"use client";

import { useSite } from "@/lib/siteContext";
import Link from "next/link";
import { useEffect, useState } from "react";
import { money, useVendor } from "@/lib/vendorContext";

type Stats = {
  products: number;
  pendingProducts: number;
  orders: number;
  pendingEarnings: number;
  monthSales: number;
  balance: number;
  pendingPayout: number;
  totalSales: number;
  totalEarned: number;
  totalCommission: number;
  totalWithdrawn: number;
};
type RecentOrder = { _id: string; status: string; paymentStatus: string; createdAt: string; myTotal: number };

function Card({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-extrabold ${tone || ""}`}>{value}</p>
      {sub && <p className="mt-1 text-[11px] text-slate-500">{sub}</p>}
    </div>
  );
}

export default function VendorDashboard() {
  const { vendor } = useVendor();
  const { siteName } = useSite();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<RecentOrder[]>([]);

  useEffect(() => {
    fetch("/api/vendor/stats", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setStats(d.stats);
          setRecent(d.recentOrders);
        }
      });
  }, []);

  if (!stats) return <p className="text-slate-400">Loading...</p>;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-100">
        {siteName} commission on your sales: <b>{vendor?.effectiveCommissionRate}%</b>. You keep the rest. Earnings are
        added to your wallet once an order is <b>delivered and paid</b>.
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card label="Wallet balance" value={money(stats.balance)} sub="Ready to withdraw" tone="text-emerald-400" />
        <Card label="Waiting for delivery" value={money(stats.pendingEarnings)} sub="Your share, not yet settled" />
        <Card label="Sales this month" value={money(stats.monthSales)} />
        <Card label="Total withdrawn" value={money(stats.totalWithdrawn)} sub={`${money(stats.pendingPayout)} in review`} />
        <Card label="Lifetime sales" value={money(stats.totalSales)} />
        <Card label="Lifetime earnings" value={money(stats.totalEarned)} sub={`Commission paid ${money(stats.totalCommission)}`} />
        <Card label="Products" value={String(stats.products)} sub={stats.pendingProducts ? `${stats.pendingProducts} awaiting approval` : "All reviewed"} />
        <Card label="Orders" value={String(stats.orders)} />
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">Recent orders</h2>
          <Link href="/vendor/orders" className="text-xs text-blue-400">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-slate-400">No orders yet. Add products to start selling.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {recent.map((o) => (
              <div key={o._id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="font-semibold">#{o._id.slice(-8).toUpperCase()}</p>
                  <p className="text-xs text-slate-500">{new Date(o.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{money(o.myTotal)}</p>
                  <p className="text-xs capitalize text-slate-400">
                    {o.status} · {o.paymentStatus}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
