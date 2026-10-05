"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getCustomerUserId } from "@/lib/customerAuth";
import { useCurrency } from "@/lib/useCurrency";
import { ORDER_STEPS, REQUEST_REASONS, REQUEST_TYPES, RETURN_WINDOW_DAYS } from "@/lib/orderRules";
import { COURIER_NOTE } from "@/lib/refundPolicy";
import { OrderModals, useOrderActions } from "@/components/OrderActions";

type Item = {
  productId: string;
  name: string;
  image?: string;
  price: number;
  quantity: number;
  courierCharge: number;
  slug: string;
  available: boolean;
  sellerName: string;
};
type Req = {
  _id: string;
  type: string;
  auto?: boolean;
  reason: string;
  details?: string;
  status: string;
  amount: number;
  adminNote?: string;
  refundRef?: string;
  createdAt: string;
};
type Details = {
  order: {
    _id: string;
    status: string;
    paymentMethod?: string;
    paymentStatus?: string;
    totalAmount: number;
    createdAt: string;
    updatedAt?: string;
    deliveredAt?: string;
    cancelledAt?: string;
    cancelReason?: string;
    cancelledBy?: string;
    shippingZone?: string;
    customerName?: string;
    customerPhone?: string;
    deliveryAddress?: { fullName?: string; phone?: string; address?: string; area?: string; city?: string };
    items: Item[];
  };
  requests: Req[];
  breakdown: { productTotal: number; courier: number; total: number; refundable: number };
  can: { cancel: boolean; request: boolean; requestWindowDays: number; hasOpenRequest: boolean };
};

const statusColor: Record<string, string> = {
  pending: "bg-slate-500/20 text-slate-200",
  confirmed: "bg-blue-500/20 text-blue-300",
  processing: "bg-indigo-500/20 text-indigo-300",
  shipped: "bg-amber-500/20 text-amber-300",
  delivered: "bg-emerald-500/20 text-emerald-300",
  cancelled: "bg-red-500/20 text-red-300",
  approved: "bg-blue-500/20 text-blue-300",
  rejected: "bg-red-500/20 text-red-300",
  completed: "bg-emerald-500/20 text-emerald-300",
};
const typeLabel: Record<string, string> = { return: "Return", refund: "Refund", exchange: "Exchange" };

export default function OrderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { format } = useCurrency();
  const [data, setData] = useState<Details | null>(null);
  const [error, setError] = useState("");

  // request form
  const [type, setType] = useState<string>("return");
  const [reason, setReason] = useState(REQUEST_REASONS[0]);
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [formMsg, setFormMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const userId = getCustomerUserId();
    if (!userId) {
      router.replace(`/login?redirect=/orders/${id}`);
      return;
    }
    try {
      const res = await fetch(`/api/orders/${id}/details`, { headers: { "x-user-id": userId }, cache: "no-store" });
      const d = await res.json();
      if (!res.ok || !d.success) throw new Error(d.message || "Unable to load this order.");
      setData(d);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load this order.");
    }
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  // "Return / Refund" in the menu opens this page at the request form
  useEffect(() => {
    if (data && new URLSearchParams(window.location.search).get("request") === "1") {
      document.getElementById("request-form")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [data]);

  const order = data?.order;
  const a = useOrderActions(
    order
      ? { _id: order._id, status: order.status, paymentMethod: order.paymentMethod, paymentStatus: order.paymentStatus, deliveredAt: order.deliveredAt, updatedAt: order.updatedAt, items: order.items }
      : { _id: id },
    load
  );

  async function sendRequest() {
    setSending(true);
    setFormMsg(null);
    try {
      const res = await fetch(`/api/orders/${id}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": getCustomerUserId() },
        body: JSON.stringify({ type, reason, details }),
      });
      const d = await res.json();
      setFormMsg({ ok: res.ok && d.success, text: d.message });
      if (res.ok && d.success) {
        setDetails("");
        await load();
      }
    } finally {
      setSending(false);
    }
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
        <div className="mx-auto max-w-3xl">
          <Link href="/orders" className="text-xs text-slate-400">← My Orders</Link>
          <p className="mt-4 rounded-xl bg-red-500/10 p-4 text-sm text-red-300">{error}</p>
        </div>
      </main>
    );
  }
  if (!data || !order) return <main className="min-h-screen bg-slate-950 p-8 text-slate-400">Loading...</main>;

  const stepIndex = ORDER_STEPS.indexOf(order.status as (typeof ORDER_STEPS)[number]);
  const cancelled = order.status === "cancelled";
  const addr = order.deliveryAddress;
  const paidOnline = order.paymentMethod !== "cod" && order.paymentStatus === "paid";

  return (
    <main className="min-h-screen bg-slate-950 px-4 pb-28 pt-6 text-white">
      <div className="mx-auto max-w-3xl space-y-4">
        <Link href="/orders" className="text-xs text-slate-400">← My Orders</Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold">Order #{order._id.slice(-8).toUpperCase()}</h1>
            <p className="text-xs text-slate-400">Placed {new Date(order.createdAt).toLocaleString()}</p>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize ${statusColor[order.status] || ""}`}>{order.status}</span>
        </div>

        {/* actions */}
        <div className="flex flex-wrap gap-2 text-xs">
          <Link href={`/track-order?id=${order._id}`} className="rounded-xl border border-white/10 px-3 py-2">🚚 Track</Link>
          <Link href={`/orders/${order._id}/invoice`} className="rounded-xl border border-white/10 px-3 py-2">⬇ Invoice</Link>
          <button onClick={a.buyAgain} disabled={a.busy} className="rounded-xl border border-white/10 px-3 py-2 disabled:opacity-50">🔁 Buy Again</button>
          <button onClick={a.contactSeller} disabled={a.busy} className="rounded-xl border border-white/10 px-3 py-2 disabled:opacity-50">💬 Contact Seller</button>
          {data.can.cancel && (
            <button onClick={() => a.setCancelOpen(true)} className="rounded-xl bg-red-600 px-3 py-2 font-bold">✖ Cancel Order</button>
          )}
        </div>

        {/* progress */}
        {cancelled ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm">
            <p className="font-bold text-red-300">This order is cancelled</p>
            <p className="mt-1 text-xs text-slate-300">
              {order.cancelledAt ? new Date(order.cancelledAt).toLocaleString() : ""}
              {order.cancelledBy ? ` · by ${order.cancelledBy}` : ""}
            </p>
            {order.cancelReason && <p className="mt-1 text-xs text-slate-300">Reason: {order.cancelReason}</p>}
            <p className="mt-2 text-[11px] text-slate-400">Saved in History → Cancelled.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
            <div className="flex items-start justify-between">
              {ORDER_STEPS.map((s, i) => (
                <div key={s} className="flex flex-1 flex-col items-center text-center">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${i <= stepIndex ? "bg-emerald-500 text-white" : "bg-white/10 text-slate-500"}`}>
                    {i <= stepIndex ? "✓" : i + 1}
                  </div>
                  <p className={`mt-1 text-[10px] capitalize ${i <= stepIndex ? "text-emerald-300" : "text-slate-500"}`}>{s}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* items */}
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
          <h2 className="mb-3 font-bold">Items</h2>
          <div className="space-y-3">
            {order.items.map((item, i) => (
              <div key={i} className="flex gap-3">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt="" className="h-16 w-16 shrink-0 rounded-xl bg-white/5 object-contain" />
                ) : (
                  <div className="h-16 w-16 shrink-0 rounded-xl bg-white/5" />
                )}
                <div className="min-w-0 flex-1">
                  {item.slug ? (
                    <Link href={`/products/${item.slug}`} className="block truncate text-sm font-semibold hover:underline">{item.name}</Link>
                  ) : (
                    <p className="truncate text-sm font-semibold">{item.name}</p>
                  )}
                  <p className="text-xs text-slate-400">Sold by {item.sellerName}</p>
                  <p className="text-xs text-slate-400">{item.quantity} × {format(item.price)}</p>
                  {item.courierCharge > 0 && <p className="text-[11px] text-sky-400">+ Courier {format(item.courierCharge)}</p>}
                </div>
                <p className="shrink-0 text-sm font-bold">{format(item.price * item.quantity)}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-1.5 border-t border-white/10 pt-3 text-sm">
            <div className="flex justify-between text-slate-300"><span>Products</span><span>{format(data.breakdown.productTotal)}</span></div>
            {data.breakdown.courier > 0 && (
              <div className="flex justify-between text-slate-300"><span>Courier charge</span><span>{format(data.breakdown.courier)}</span></div>
            )}
            <div className="flex justify-between text-base font-extrabold"><span>Total</span><span className="text-emerald-400">{format(order.totalAmount)}</span></div>
            {data.breakdown.courier > 0 && (
              <p className="pt-1 text-[11px] leading-relaxed text-slate-500">
                If cancelled or returned you get back {format(data.breakdown.refundable)}. {COURIER_NOTE}
              </p>
            )}
          </div>
        </div>

        {/* delivery + payment */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-900 p-4 text-sm">
            <h2 className="mb-2 font-bold">Delivery address</h2>
            <p className="font-semibold">{addr?.fullName || order.customerName}</p>
            <p className="text-slate-300">{[addr?.address, addr?.area, addr?.city].filter(Boolean).join(", ")}</p>
            <p className="mt-1 text-slate-300">📞 {addr?.phone || order.customerPhone}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900 p-4 text-sm">
            <h2 className="mb-2 font-bold">Payment</h2>
            <p className="text-slate-300">{order.paymentMethod === "cod" ? "Cash on Delivery" : "Paid online"}</p>
            <p className="capitalize text-slate-400">Status: {order.paymentStatus || "pending"}</p>
            {order.deliveredAt && <p className="mt-1 text-xs text-slate-400">Delivered {new Date(order.deliveredAt).toLocaleDateString()}</p>}
          </div>
        </div>

        {/* requests already sent */}
        {data.requests.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
            <h2 className="mb-3 font-bold">Requests for this order</h2>
            <div className="space-y-3">
              {data.requests.map((r) => (
                <div key={r._id} className="rounded-xl bg-slate-950 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">
                      {r.auto ? "Refund for the cancelled order" : typeLabel[r.type] || r.type}
                    </p>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${statusColor[r.status] || ""}`}>{r.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{r.reason}{r.details ? ` · ${r.details}` : ""}</p>
                  {r.type !== "exchange" && r.amount > 0 && <p className="mt-1 text-xs text-slate-300">Refund amount: {format(r.amount)}</p>}
                  {r.adminNote && <p className="mt-1 text-xs text-amber-200">Note from us: {r.adminNote}</p>}
                  {r.refundRef && <p className="mt-1 text-xs text-emerald-300">Refund sent · ref {r.refundRef}</p>}
                  <p className="mt-1 text-[11px] text-slate-500">{new Date(r.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
            {paidOnline && cancelled && <p className="mt-3 text-[11px] text-slate-500">Refunds are sent to the way you paid, usually within a few working days.</p>}
          </div>
        )}

        {/* ask for a return / refund / exchange */}
        {order.status === "delivered" && (
          <div id="request-form" className="rounded-2xl border border-white/10 bg-slate-900 p-4">
            <h2 className="font-bold">Return / Refund / Exchange</h2>

            {data.can.request ? (
              <>
                <p className="mt-1 text-xs text-slate-400">
                  You can ask within {RETURN_WINDOW_DAYS} days of delivery ({data.can.requestWindowDays} day(s) left).
                </p>
                <div className="mt-3 space-y-2">
                  {REQUEST_TYPES.map((t) => (
                    <label
                      key={t.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm ${type === t.value ? "border-orange-500 bg-orange-500/10" : "border-white/10"}`}
                    >
                      <input type="radio" name="reqtype" className="mt-1" checked={type === t.value} onChange={() => setType(t.value)} />
                      <span>
                        <b>{t.label}</b>
                        <br />
                        <span className="text-xs text-slate-400">{t.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white"
                >
                  {REQUEST_REASONS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Tell us what happened (optional)"
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white"
                />
                <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{COURIER_NOTE}</p>
                {formMsg && <p className={`mt-2 rounded-lg p-2.5 text-xs ${formMsg.ok ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>{formMsg.text}</p>}
                <button onClick={sendRequest} disabled={sending} className="mt-3 w-full rounded-xl bg-blue-600 p-3 text-sm font-bold disabled:opacity-60">
                  {sending ? "Sending..." : "Send request"}
                </button>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-400">
                {data.can.hasOpenRequest
                  ? "You already have an open request for this order. We will update it above."
                  : `The ${RETURN_WINDOW_DAYS}-day return period for this order is over.`}
              </p>
            )}
          </div>
        )}
      </div>

      <OrderModals order={{ _id: order._id, status: order.status, paymentMethod: order.paymentMethod, paymentStatus: order.paymentStatus }} a={a} />
    </main>
  );
}
