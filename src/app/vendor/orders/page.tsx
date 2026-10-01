"use client";

import { useEffect, useState } from "react";
import { money } from "@/lib/vendorContext";

type Row = {
  _id: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  settled: boolean;
  reversed: boolean;
  deliverTo: string;
  items: { name: string; image?: string; price: number; quantity: number; commissionRate?: number; vendorEarning?: number }[];
  gross: number;
  commission: number;
  earning: number;
};

const statusColor: Record<string, string> = {
  pending: "bg-slate-500/20 text-slate-300",
  confirmed: "bg-blue-500/20 text-blue-300",
  processing: "bg-indigo-500/20 text-indigo-300",
  shipped: "bg-amber-500/20 text-amber-300",
  delivered: "bg-emerald-500/20 text-emerald-300",
  cancelled: "bg-red-500/20 text-red-300",
};

export default function VendorOrdersPage() {
  const [orders, setOrders] = useState<Row[] | null>(null);

  useEffect(() => {
    fetch("/api/vendor/orders", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setOrders(d.success ? d.orders : []));
  }, []);

  if (!orders) return <p className="text-slate-400">Loading...</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">Orders with your products</h1>
      <p className="text-xs text-slate-400">
        TechStar collects the payment and handles delivery. Your share is credited to your wallet after the order is
        delivered and paid.
      </p>

      {orders.length === 0 && <p className="text-sm text-slate-400">No orders yet.</p>}

      {orders.map((o) => (
        <div key={o._id} className="rounded-2xl border border-white/10 bg-slate-900 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-bold">#{o._id.slice(-8).toUpperCase()}</p>
              <p className="text-xs text-slate-500">
                {new Date(o.createdAt).toLocaleString()} {o.deliverTo ? `· ${o.deliverTo}` : ""}
              </p>
            </div>
            <div className="flex gap-2 text-[11px] font-semibold">
              <span className={`rounded-full px-2.5 py-1 capitalize ${statusColor[o.status] || ""}`}>{o.status}</span>
              <span className="rounded-full bg-white/5 px-2.5 py-1 capitalize text-slate-300">{o.paymentStatus}</span>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {o.items.map((i, idx) => (
              <div key={idx} className="flex items-center gap-3 text-sm">
                {i.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={i.image} alt="" className="h-10 w-10 rounded-lg bg-white/5 object-contain" />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-white/5" />
                )}
                <p className="min-w-0 flex-1 truncate">
                  {i.name} <span className="text-slate-500">× {i.quantity}</span>
                </p>
                <p className="font-semibold">{money(i.price * i.quantity)}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/5 pt-3 text-center text-xs">
            <div>
              <p className="text-slate-500">Sale</p>
              <p className="font-bold">{money(o.gross)}</p>
            </div>
            <div>
              <p className="text-slate-500">Commission</p>
              <p className="font-bold text-amber-300">-{money(o.commission)}</p>
            </div>
            <div>
              <p className="text-slate-500">You earn</p>
              <p className="font-bold text-emerald-400">{money(o.earning)}</p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            {o.reversed
              ? "Order cancelled after payment, amount was taken back from your wallet."
              : o.settled
              ? "✅ Added to your wallet."
              : o.status === "cancelled"
              ? "Order cancelled."
              : "⏳ Will be added to your wallet after delivery and payment."}
          </p>
        </div>
      ))}
    </div>
  );
}
