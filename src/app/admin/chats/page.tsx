"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Conv = {
  _id: string;
  customerName: string;
  vendorId: string;
  vendorName: string;
  vendorStatus: string;
  vendorTotalViolations: number;
  productName: string;
  lastMessageAt: string;
  violationsCustomer: number;
  violationsVendor: number;
  locked: boolean;
  reported: boolean;
  reportReason: string;
};
type Msg = { _id: string; sender: "customer" | "vendor"; text: string; blocked: boolean; blockReason?: string; createdAt: string };

async function call(url: string, method = "GET", body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error("Please login as admin first (/admin/login).");
  if (!res.ok || d.success === false) throw new Error(d.message || "Request failed.");
  return d;
}

export default function AdminChatsPage() {
  const [filter, setFilter] = useState("flagged");
  const [list, setList] = useState<Conv[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [error, setError] = useState("");

  const run = useCallback(async (fn: () => Promise<void>) => {
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }, []);

  const loadList = useCallback(
    () =>
      run(async () => {
        const d = await call(`/api/admin/chats?filter=${filter}`);
        setList(d.conversations);
      }),
    [run, filter]
  );

  useEffect(() => {
    loadList();
  }, [loadList]);

  const openChat = (id: string) =>
    run(async () => {
      if (open === id) return setOpen(null);
      const d = await call(`/api/admin/chats/${id}`);
      setMessages(d.messages);
      setOpen(id);
    });

  const patch = (id: string, body: Record<string, unknown>) =>
    run(async () => {
      await call(`/api/admin/chats/${id}`, "PATCH", body);
      await loadList();
    });

  const suspendVendor = (vendorId: string, name: string) =>
    run(async () => {
      if (!confirm(`Suspend "${name}"? Their products will be hidden.`)) return;
      await call("/api/admin/marketplace/vendors", "PATCH", { id: vendorId, status: "suspended" });
      await loadList();
    });

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white">
      <div className="mx-auto max-w-4xl">
        <Link href="/admin" className="text-xs text-slate-400">
          ← Admin dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold">Chat monitor</h1>
        <p className="mt-1 text-xs text-slate-400">
          Blocked messages (phone numbers, links, “order outside”) are saved here and never reach the other person.
        </p>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="mt-4 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
        >
          <option value="flagged">Flagged (blocked messages)</option>
          <option value="reported">Reported by customers</option>
          <option value="locked">Locked</option>
          <option value="all">All chats</option>
        </select>

        {error && <p className="mt-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
        {list.length === 0 && <p className="mt-4 text-sm text-slate-400">Nothing here.</p>}

        <div className="mt-4 space-y-3">
          {list.map((c) => (
            <div key={c._id} className="rounded-2xl border border-white/10 bg-slate-900 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold">
                    {c.vendorName} <span className="font-normal text-slate-400">↔ {c.customerName}</span>
                  </p>
                  {c.productName && <p className="text-xs text-slate-500">About: {c.productName}</p>}
                </div>
                <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
                  {c.violationsVendor > 0 && (
                    <span className="rounded-full bg-red-500/20 px-2.5 py-1 text-red-300">Vendor blocked × {c.violationsVendor}</span>
                  )}
                  {c.violationsCustomer > 0 && (
                    <span className="rounded-full bg-amber-500/20 px-2.5 py-1 text-amber-300">Customer blocked × {c.violationsCustomer}</span>
                  )}
                  {c.reported && <span className="rounded-full bg-purple-500/20 px-2.5 py-1 text-purple-300">Reported</span>}
                  {c.locked && <span className="rounded-full bg-slate-500/30 px-2.5 py-1">Locked</span>}
                </div>
              </div>

              {c.reported && c.reportReason && <p className="mt-2 text-xs text-purple-200">Customer says: {c.reportReason}</p>}
              <p className="mt-1 text-[11px] text-slate-500">
                Vendor total blocked attempts: {c.vendorTotalViolations} · vendor status: {c.vendorStatus}
              </p>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <button onClick={() => openChat(c._id)} className="rounded-lg bg-blue-600 px-3 py-2 font-bold">
                  {open === c._id ? "Hide chat" : "Read chat"}
                </button>
                <button onClick={() => patch(c._id, { locked: !c.locked })} className="rounded-lg border border-white/10 px-3 py-2">
                  {c.locked ? "Unlock" : "Lock chat"}
                </button>
                {c.reported && (
                  <button onClick={() => patch(c._id, { clearReport: true })} className="rounded-lg border border-white/10 px-3 py-2">
                    Clear report
                  </button>
                )}
                {c.violationsVendor + c.violationsCustomer > 0 && (
                  <button onClick={() => patch(c._id, { resetViolations: true })} className="rounded-lg border border-white/10 px-3 py-2">
                    Reset warnings
                  </button>
                )}
                {c.vendorStatus === "approved" && (
                  <button onClick={() => suspendVendor(c.vendorId, c.vendorName)} className="rounded-lg bg-amber-600 px-3 py-2 font-bold">
                    Suspend vendor
                  </button>
                )}
              </div>

              {open === c._id && (
                <div className="mt-3 max-h-96 space-y-2 overflow-y-auto rounded-xl bg-slate-950 p-3">
                  {messages.map((m) => (
                    <div
                      key={m._id}
                      className={`rounded-xl px-3 py-2 text-sm ${
                        m.blocked
                          ? "border border-red-500/40 bg-red-500/10"
                          : m.sender === "vendor"
                          ? "bg-blue-600/30"
                          : "bg-slate-800"
                      }`}
                    >
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">
                        {m.sender} · {new Date(m.createdAt).toLocaleString()}
                        {m.blocked && <span className="ml-2 font-bold text-red-300">BLOCKED ({m.blockReason})</span>}
                      </p>
                      <p className="mt-0.5 whitespace-pre-wrap break-words">{m.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
