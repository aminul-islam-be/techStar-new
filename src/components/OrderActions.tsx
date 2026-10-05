"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getCustomerUserId } from "@/lib/customerAuth";
import { CANCEL_REASONS, canCancelOrder, returnWindow } from "@/lib/orderRules";
import { COURIER_NOTE } from "@/lib/refundPolicy";

export type OrderLite = {
  _id: string;
  status?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  deliveredAt?: string;
  updatedAt?: string;
  items?: { productId?: string; name?: string; quantity?: number }[];
};
type Seller = { key: string; name: string; slug: string };

const auth = () => ({ "x-user-id": getCustomerUserId() });

/** Everything a customer can do with one order. Used by the 3-dot menu and the order page. */
export function useOrderActions(order: OrderLite, onChanged?: () => void) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [sellers, setSellers] = useState<Seller[] | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  const say = (ok: boolean, text: string) => {
    setNotice({ ok, text });
    setTimeout(() => setNotice(null), 6000);
  };

  /** Puts every product of this order back in the cart, then opens the cart. */
  async function buyAgain() {
    const items = order.items || [];
    if (!items.length) return say(false, "There are no items to add.");
    setBusy(true);
    let added = 0;
    const missed: string[] = [];
    for (const item of items) {
      try {
        const res = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...auth() },
          body: JSON.stringify({ productId: item.productId, quantity: item.quantity || 1 }),
        });
        const d = await res.json();
        if (res.ok && d.success) added++;
        else missed.push(item.name || "an item");
      } catch {
        missed.push(item.name || "an item");
      }
    }
    setBusy(false);
    if (added === 0) return say(false, "These items are not available right now.");
    if (missed.length) say(true, `Added ${added} item(s). Not available: ${missed.join(", ")}.`);
    router.push("/cart");
  }

  /** Opens a chat with the seller (asks which seller if the order has several). */
  async function contactSeller() {
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${order._id}/details`, { headers: auth(), cache: "no-store" });
      const d = await res.json();
      const list: Seller[] = d.success ? d.sellers : [];
      if (!list.length) return say(false, "No seller could be found for this order.");
      if (list.length === 1) router.push(`/messages/new/${list[0].slug}?order=${order._id}`);
      else setSellers(list);
    } catch {
      say(false, "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  /** Returns an error text, or null when the order was cancelled. */
  async function cancel(reason: string): Promise<string | null> {
    try {
      const res = await fetch(`/api/orders/${order._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...auth() },
        body: JSON.stringify({ action: "cancel", reason }),
      });
      const d = await res.json();
      if (!res.ok || !d.success) return d.message || "Unable to cancel the order.";
      say(
        true,
        d.refund
          ? `Order cancelled. Your refund of ৳${Number(d.refund.amount).toLocaleString("en-US")} will be sent to you after a quick review.`
          : "Your order has been cancelled. It is saved in History → Cancelled."
      );
      setCancelOpen(false);
      onChanged?.();
      return null;
    } catch {
      return "Something went wrong. Please try again.";
    }
  }

  return {
    busy,
    notice,
    sellers,
    setSellers,
    cancelOpen,
    setCancelOpen,
    buyAgain,
    contactSeller,
    cancel,
    canCancel: canCancelOrder(order),
    win: returnWindow(order),
  };
}

export type OrderActions = ReturnType<typeof useOrderActions>;

/** The cancel dialog, the "which seller?" dialog and the small message at the bottom. */
export function OrderModals({ order, a }: { order: OrderLite; a: OrderActions }) {
  const router = useRouter();
  const [reason, setReason] = useState(CANCEL_REASONS[0]);
  const [other, setOther] = useState("");
  const [err, setErr] = useState("");
  const [working, setWorking] = useState(false);
  const paidOnline = order.paymentMethod !== "cod" && order.paymentStatus === "paid";

  async function confirmCancel() {
    setWorking(true);
    setErr("");
    const text = reason === "Other" ? other.trim() || "Other" : reason;
    const problem = await a.cancel(text);
    if (problem) setErr(problem);
    setWorking(false);
  }

  return (
    <>
      {a.cancelOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-5 text-white shadow-2xl">
            <h2 className="text-lg font-extrabold">Cancel this order?</h2>
            <p className="mt-1 text-xs text-slate-400">Order #{order._id.slice(-8).toUpperCase()}</p>

            <label className="mt-4 block text-xs text-slate-400">
              Why are you cancelling?
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white"
              >
                {CANCEL_REASONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            {reason === "Other" && (
              <textarea
                value={other}
                onChange={(e) => setOther(e.target.value)}
                rows={2}
                maxLength={150}
                placeholder="Tell us a little more"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white"
              />
            )}

            <p className="mt-3 rounded-xl bg-white/[0.05] p-3 text-[11px] leading-relaxed text-slate-300">
              {paidOnline
                ? `You paid online, so the refund goes back to you after a quick review. ${COURIER_NOTE}`
                : "You have not paid yet, so nothing will be charged. The cancelled order is saved in History."}
            </p>

            {err && <p className="mt-3 rounded-lg bg-red-500/10 p-2.5 text-xs text-red-300">{err}</p>}

            <div className="mt-4 flex gap-2">
              <button onClick={() => a.setCancelOpen(false)} className="flex-1 rounded-xl border border-white/10 p-3 text-sm">
                Keep my order
              </button>
              <button
                onClick={confirmCancel}
                disabled={working}
                className="flex-1 rounded-xl bg-red-600 p-3 text-sm font-bold disabled:opacity-60"
              >
                {working ? "Cancelling..." : "Yes, cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {a.sellers && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-5 text-white shadow-2xl">
            <h2 className="text-lg font-extrabold">Who do you want to message?</h2>
            <p className="mt-1 text-xs text-slate-400">This order has products from more than one seller.</p>
            <div className="mt-3 space-y-2">
              {a.sellers.map((s) => (
                <button
                  key={s.key}
                  onClick={() => router.push(`/messages/new/${s.slug}?order=${order._id}`)}
                  className="flex w-full items-center justify-between rounded-xl border border-white/10 p-3 text-left text-sm hover:bg-white/10"
                >
                  <span className="font-semibold">{s.name}</span>
                  <span className="text-xs text-slate-400">Chat →</span>
                </button>
              ))}
            </div>
            <button onClick={() => a.setSellers(null)} className="mt-3 w-full rounded-xl border border-white/10 p-3 text-sm">
              Close
            </button>
          </div>
        </div>
      )}

      {a.notice && (
        <div
          className={`fixed bottom-24 left-1/2 z-50 w-[92%] max-w-sm -translate-x-1/2 rounded-xl p-3 text-center text-sm shadow-xl ${
            a.notice.ok ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {a.notice.text}
        </div>
      )}
    </>
  );
}

/** The 3-dot menu on every order in My Orders. */
export function OrderActionsMenu({ order, onChanged }: { order: OrderLite; onChanged?: () => void }) {
  const a = useOrderActions(order, onChanged);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const outside = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", outside);
    document.addEventListener("touchstart", outside);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("touchstart", outside);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const row = "flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-white hover:bg-white/10 disabled:opacity-50";
  const delivered = order.status === "delivered";

  return (
    <div ref={ref} className="relative">
      <button
        aria-label="Order actions"
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-lg leading-none text-slate-300 hover:bg-white/10"
      >
        ⋮
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-slate-900 py-1 shadow-2xl">
          <Link href={`/orders/${order._id}`} className={row} onClick={() => setOpen(false)}>
            📄 Order Details
          </Link>
          <Link href={`/track-order?id=${order._id}`} className={row} onClick={() => setOpen(false)}>
            🚚 Track Order
          </Link>
          {a.canCancel && (
            <button
              className={`${row} !text-red-300`}
              onClick={() => {
                setOpen(false);
                a.setCancelOpen(true);
              }}
            >
              ✖ Cancel Order
            </button>
          )}
          {delivered &&
            (a.win.open ? (
              <Link href={`/orders/${order._id}?request=1`} className={row} onClick={() => setOpen(false)}>
                ↩ Return / Refund
              </Link>
            ) : (
              <span className={`${row} cursor-not-allowed !text-slate-500`}>↩ Return period ended</span>
            ))}
          <Link href={`/orders/${order._id}/invoice`} className={row} onClick={() => setOpen(false)}>
            ⬇ Download Invoice
          </Link>
          <button
            className={row}
            disabled={a.busy}
            onClick={() => {
              setOpen(false);
              a.buyAgain();
            }}
          >
            🔁 Buy Again
          </button>
          <button
            className={row}
            disabled={a.busy}
            onClick={() => {
              setOpen(false);
              a.contactSeller();
            }}
          >
            💬 Contact Seller
          </button>
        </div>
      )}

      <OrderModals order={order} a={a} />
    </div>
  );
}
