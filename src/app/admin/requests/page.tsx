"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Row = {
  _id: string;
  orderId: string;
  type: string;
  auto?: boolean;
  reason: string;
  details?: string;
  status: string;
  amount: number;
  adminNote?: string;
  refundRef?: string;
  createdAt: string;
  order: {
    customerName?: string;
    customerPhone?: string;
    totalAmount: number;
    currency: string;
    paymentMethod?: string;
    paymentStatus?: string;
    status: string;
    items: string[];
  } | null;
};

const typeLabel: Record<string, string> = { return: "Return", refund: "Refund", exchange: "Exchange" };
const badge: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-300",
  approved: "bg-blue-500/20 text-blue-300",
  completed: "bg-emerald-500/20 text-emerald-300",
  rejected: "bg-red-500/20 text-red-300",
};

async function call(method: "GET" | "PATCH", url: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const d = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error("Please login as admin first (/admin/login).");
  if (!res.ok || d.success === false) throw new Error(d.message || "Request failed.");
  return d;
}

export default function AdminRequestsPage() {
  const [filter, setFilter] = useState("open");
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await call("GET", `/api/admin/order-requests?status=${filter}`);
      setRows(d.requests);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (r: Row, action: "approve" | "reject" | "complete") => {
    let adminNote = "";
    let refundRef = "";
    const online = r.order && r.order.paymentMethod !== "cod" && r.order.paymentStatus === "paid";

    if (action === "reject") {
      adminNote = prompt("Reason for the customer (they will see this):") || "";
      if (!adminNote.trim()) return;
    } else if (action === "complete") {
      if (r.type !== "exchange" && online) {
        refundRef = prompt("Reference of the refund you sent (bKash / bank / gateway):") || "";
        if (!refundRef.trim()) return;
      } else if (r.type !== "exchange") {
        if (!confirm("Cash on Delivery order: the vendor refunds the customer directly. Mark this as completed?")) return;
      }
      adminNote = prompt("Note for the customer (optional):") || "";
    }

    try {
      await call("PATCH", "/api/admin/order-requests", { id: r._id, action, note: adminNote, refundRef });
      setNote(action === "complete" ? "Completed." : action === "approve" ? "Approved." : "Rejected.");
      setTimeout(() => setNote(""), 2500);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white">
      <div className="mx-auto max-w-4xl">
        <Link href="/admin" className="text-xs text-slate-400">← Admin dashboard</Link>
        <h1 className="mt-2 text-2xl font-extrabold">Returns, refunds &amp; exchanges</h1>
        <p className="mt-1 text-xs text-slate-400">
          Customer requests after delivery, and refunds owed for orders that were paid online and then cancelled. Completing a return
          closes the order as cancelled and takes back the vendor&apos;s commission or wallet credit. Only the product price is refunded.
        </p>

        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="mt-4 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
          <option value="open">Needs action (new + approved)</option>
          <option value="pending">New</option>
          <option value="approved">Approved</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
          <option value="all">All</option>
        </select>

        {error && <p className="mt-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
        {note && <p className="mt-3 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-300">{note}</p>}
        {rows.length === 0 && !error && <p className="mt-4 text-sm text-slate-400">Nothing here.</p>}

        <div className="mt-4 space-y-3">
          {rows.map((r) => {
            const online = r.order && r.order.paymentMethod !== "cod" && r.order.paymentStatus === "paid";
            return (
              <div key={r._id} className="rounded-2xl border border-white/10 bg-slate-900 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">
                      {r.auto ? "Refund · order cancelled by customer" : typeLabel[r.type] || r.type}
                      <span className="ml-2 text-xs font-normal text-slate-400">Order #{r.orderId.slice(-8).toUpperCase()}</span>
                    </p>
                    {r.order && (
                      <p className="text-xs text-slate-400">
                        {r.order.customerName} · {r.order.customerPhone} · {r.order.paymentMethod === "cod" ? "Cash on Delivery" : online ? "Paid online" : "Online (unpaid)"}
                      </p>
                    )}
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${badge[r.status] || ""}`}>{r.status}</span>
                </div>

                {r.order && <p className="mt-2 text-xs text-slate-300">{r.order.items.join(", ")}</p>}
                <p className="mt-2 text-sm">Reason: {r.reason}</p>
                {r.details && <p className="text-xs text-slate-400">“{r.details}”</p>}
                {r.type !== "exchange" && (
                  <p className="mt-2 text-sm">
                    Refund the customer: <b className="text-emerald-400">{r.order?.currency || "BDT"} {r.amount}</b>
                    <span className="text-xs text-slate-500"> (product price{r.order ? ` of ${r.order.totalAmount} total` : ""})</span>
                  </p>
                )}
                {r.adminNote && <p className="mt-1 text-xs text-amber-200">Note sent: {r.adminNote}</p>}
                {r.refundRef && <p className="mt-1 text-xs text-emerald-300">Refund ref: {r.refundRef}</p>}
                <p className="mt-1 text-[11px] text-slate-500">{new Date(r.createdAt).toLocaleString()}</p>

                {["pending", "approved"].includes(r.status) && (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {r.status === "pending" && !r.auto && (
                      <button onClick={() => act(r, "approve")} className="rounded-lg bg-blue-600 px-3 py-2 font-bold">Approve</button>
                    )}
                    <button onClick={() => act(r, "complete")} className="rounded-lg bg-emerald-600 px-3 py-2 font-bold">
                      {r.type === "exchange" ? "Mark exchange done" : r.auto ? "Mark refund sent" : "Parcel back + refund sent"}
                    </button>
                    {!r.auto && (
                      <button onClick={() => act(r, "reject")} className="rounded-lg bg-red-600 px-3 py-2 font-bold">Reject</button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
