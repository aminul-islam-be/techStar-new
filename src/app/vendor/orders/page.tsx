"use client";

import { useSite } from "@/lib/siteContext";
import { useEffect, useState } from "react";
import { money } from "@/lib/vendorContext";

type Row = {
  _id: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  paymentMethod: "cod" | "online";
  zone: string;
  cashToCollect: number;
  settled: boolean;
  reversed: boolean;
  customer: { name: string; phone: string; address: string; area: string; city: string } | null;
  items: { name: string; image?: string; price: number; quantity: number; courierCharge: number }[];
  gross: number;
  courier: number;
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

function Copy({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard blocked */
        }
      }}
      className="rounded-md border border-white/10 px-2 py-0.5 text-[10px] text-slate-300"
    >
      {done ? "Copied" : "Copy"}
    </button>
  );
}

export default function VendorOrdersPage() {
  const { siteName } = useSite();
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
        You send every parcel by courier. The customer&apos;s phone and address appear here after {siteName} confirms the order.
        Use them only to deliver that parcel.
      </p>

      {orders.length === 0 && <p className="text-sm text-slate-400">No orders yet.</p>}

      {orders.map((o) => (
        <div key={o._id} className="rounded-2xl border border-white/10 bg-slate-900 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-bold">#{o._id.slice(-8).toUpperCase()}</p>
              <p className="text-xs text-slate-500">{new Date(o.createdAt).toLocaleString()}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
              <span className={`rounded-full px-2.5 py-1 capitalize ${statusColor[o.status] || ""}`}>{o.status}</span>
              <span className="rounded-full bg-white/5 px-2.5 py-1 text-slate-300">
                {o.paymentMethod === "cod" ? "Cash on Delivery" : `Online · ${o.paymentStatus}`}
              </span>
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

          {/* who to deliver to */}
          {o.customer ? (
            <div className="mt-3 rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-sm">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-blue-200">Deliver to {o.zone === "dhaka" ? "· Inside Dhaka Division" : o.zone === "outside" ? "· Outside Dhaka Division" : ""}</p>
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">{o.customer.name}</p>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p>
                  📞 <b>{o.customer.phone}</b>
                </p>
                <Copy text={o.customer.phone} />
              </div>
              <div className="mt-1 flex items-start justify-between gap-2">
                <p className="text-slate-200">
                  📍 {[o.customer.address, o.customer.area, o.customer.city].filter(Boolean).join(", ")}
                </p>
                <Copy text={[o.customer.name, o.customer.phone, o.customer.address, o.customer.area, o.customer.city].filter(Boolean).join(", ")} />
              </div>
            </div>
          ) : (
            <p className="mt-3 rounded-xl bg-white/5 p-3 text-xs text-slate-400">
              {o.status === "cancelled"
                ? "This order was cancelled."
                : `🔒 The customer's phone and address will appear here after ${siteName} confirms this order.`}
            </p>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/5 pt-3 text-center text-xs sm:grid-cols-4">
            <div>
              <p className="text-slate-500">Products</p>
              <p className="font-bold">{money(o.gross)}</p>
            </div>
            <div>
              <p className="text-slate-500">Courier charge</p>
              <p className="font-bold text-sky-300">{money(o.courier)}</p>
            </div>
            <div>
              <p className="text-slate-500">{siteName} commission</p>
              <p className="font-bold text-amber-300">-{money(o.commission)}</p>
            </div>
            <div>
              <p className="text-slate-500">You keep</p>
              <p className="font-bold text-emerald-400">{money(o.earning)}</p>
            </div>
          </div>

          {o.paymentMethod === "cod" && o.status !== "cancelled" && (
            <p className="mt-2 rounded-lg bg-amber-500/10 p-2.5 text-center text-sm text-amber-200">
              💵 Collect <b>{money(o.cashToCollect)}</b> in cash from the customer
            </p>
          )}

          <p className="mt-2 text-[11px] text-slate-500">
            {o.reversed
              ? o.paymentMethod === "cod"
                ? "Order returned: the commission was taken off your monthly bill."
                : "Order cancelled after payment, the amount was taken back from your wallet."
              : o.paymentMethod === "cod"
              ? o.settled
                ? `✅ Delivered. Commission ${money(o.commission)} was added to your monthly bill (see Billing).`
                : `⏳ After delivery, the commission ${money(o.commission)} is added to your monthly bill.`
              : o.settled
              ? "✅ Added to your wallet."
              : o.status === "cancelled"
              ? "Order cancelled."
              : "⏳ Added to your wallet after the order is delivered and paid."}
          </p>
        </div>
      ))}
    </div>
  );
}
