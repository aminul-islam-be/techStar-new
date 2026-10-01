"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type V = {
  _id: string;
  shopName: string;
  ownerName: string;
  phone: string;
  status: string;
  dueCommission: number;
  creditBalance: number;
  billingLocked: boolean;
  billingLockedAt?: string;
};
type Summary = { totalDue: number; totalCredit: number; locked: number; owing: number };
type Cfg = { commissionGraceDays: number; lastLockRunMonth: string; lastLockRunAt: string | null; currentMonth: string };

const money = (n: number | undefined | null) => "৳" + Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });

async function call(method: "GET" | "POST", url: string, body?: unknown) {
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

export default function AdminCommissionPage() {
  const [filter, setFilter] = useState("owing");
  const [vendors, setVendors] = useState<V[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [grace, setGrace] = useState("0");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const run = useCallback(async (fn: () => Promise<void>) => {
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }, []);

  const load = useCallback(
    () =>
      run(async () => {
        const d = await call("GET", `/api/admin/commission?filter=${filter}`);
        setVendors(d.vendors);
        setSummary(d.summary);
        setCfg(d.settings);
        setGrace(String(d.settings.commissionGraceDays));
      }),
    [run, filter]
  );

  useEffect(() => {
    load();
  }, [load]);

  const flash = (t: string) => {
    setNote(t);
    setTimeout(() => setNote(""), 3500);
  };

  const record = (v: V) =>
    run(async () => {
      const amount = prompt(`Amount received from "${v.shopName}" (due ${money(v.dueCommission)}):`, String(v.dueCommission));
      if (!amount) return;
      const ref = prompt("Transaction ID / reference (bKash, Nagad, bank...):") || "";
      if (!ref.trim()) return;
      const r = await call("POST", "/api/admin/commission", { action: "record", vendorId: v._id, amount: Number(amount), ref });
      flash(r.unlocked ? "Payment recorded. The shop is unlocked." : `Payment recorded. Still due: ${money(r.dueAfter)}`);
      await load();
    });

  const unlock = (v: V) =>
    run(async () => {
      if (!confirm(`Unlock "${v.shopName}" WITHOUT payment? The due amount stays on their account.`)) return;
      await call("POST", "/api/admin/commission", { action: "unlock", vendorId: v._id });
      flash("Unlocked.");
      await load();
    });

  const runLock = () =>
    run(async () => {
      if (!confirm("Lock EVERY vendor who still owes commission, right now?")) return;
      const r = await call("POST", "/api/admin/commission", { action: "runLock" });
      flash(`Done. ${r.locked} vendor(s) locked.`);
      await load();
    });

  const saveGrace = () =>
    run(async () => {
      await call("POST", "/api/admin/commission", { action: "setGrace", days: Number(grace) });
      flash("Grace period saved.");
      await load();
    });

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white">
      <div className="mx-auto max-w-4xl">
        <Link href="/admin" className="text-xs text-slate-400">
          ← Admin dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold">COD commission</h1>
        <p className="mt-1 text-xs text-slate-400">
          Vendors collect the cash on Cash on Delivery orders, so they pay your commission once a month.
        </p>

        {error && <p className="mt-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
        {note && <p className="mt-3 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-300">{note}</p>}

        {summary && cfg && (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                ["Total unpaid", money(summary.totalDue)],
                ["Vendors owing", String(summary.owing)],
                ["Vendors locked", String(summary.locked)],
                ["Advance held", money(summary.totalCredit)],
              ].map(([l, v]) => (
                <div key={l} className="rounded-2xl border border-white/10 bg-slate-900 p-4">
                  <p className="text-xs text-slate-400">{l}</p>
                  <p className="mt-1 text-lg font-bold">{v}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900 p-4">
              <h2 className="font-bold">Monthly lock</h2>
              <p className="mt-1 text-xs text-slate-400">
                Every month, vendors who still owe commission are locked automatically on the 1st (plus the grace days below), at
                12:01 AM Bangladesh time. Last automatic run: {cfg.lastLockRunMonth || "never"}
                {cfg.lastLockRunAt ? ` (${new Date(cfg.lastLockRunAt).toLocaleString()})` : ""}.
              </p>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <label className="text-xs text-slate-400">
                  Grace days after the 1st (0 = lock on the 1st)
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={grace}
                    onChange={(e) => setGrace(e.target.value)}
                    className="mt-1 block w-32 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  />
                </label>
                <button onClick={saveGrace} className="rounded-lg border border-white/10 px-4 py-2 text-xs">
                  Save
                </button>
                <button onClick={runLock} className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold">
                  Lock all owing vendors now
                </button>
              </div>
            </div>
          </>
        )}

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="mt-4 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
        >
          <option value="owing">Owing commission</option>
          <option value="locked">Locked</option>
          <option value="all">Anything on the account</option>
        </select>

        {vendors.length === 0 && <p className="mt-4 text-sm text-slate-400">Nothing here.</p>}

        <div className="mt-4 space-y-3">
          {vendors.map((v) => (
            <div key={v._id} className="rounded-2xl border border-white/10 bg-slate-900 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{v.shopName}</p>
                  <p className="text-xs text-slate-400">
                    {v.ownerName} · {v.phone}
                  </p>
                </div>
                {v.billingLocked ? (
                  <span className="rounded-full bg-red-500/20 px-2.5 py-1 text-[11px] font-semibold text-red-300">Locked</span>
                ) : (
                  <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-semibold capitalize">{v.status}</span>
                )}
              </div>
              <p className="mt-2 text-sm">
                Owes <b className={v.dueCommission > 0 ? "text-red-300" : ""}>{money(v.dueCommission)}</b>
                <span className="text-slate-400"> · advance {money(v.creditBalance)}</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <button onClick={() => record(v)} className="rounded-lg bg-emerald-600 px-3 py-2 font-bold">
                  Record payment received
                </button>
                {v.billingLocked && (
                  <button onClick={() => unlock(v)} className="rounded-lg border border-white/10 px-3 py-2">
                    Unlock without payment
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
