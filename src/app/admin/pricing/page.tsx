"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { computeCommission } from "@/lib/commissionMath";

type P = {
  defaultCommissionRate: number;
  commissionMin: number;
  commissionMax: number;
  courierInsideDhaka: number;
  courierOutsideDhaka: number;
};

const input = "mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500";
const money = (n: number) => "৳" + Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });

export default function AdminPricingPage() {
  const [p, setP] = useState<P | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/admin/pricing", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) =>
        d.success ? setP(d.pricing) : setMsg({ ok: false, text: d.message || "Please login as admin first (/admin/login)." })
      );
  }, []);

  const set = (k: keyof P) => (e: { target: { value: string } }) => p && setP({ ...p, [k]: Number(e.target.value) });

  async function save() {
    if (!p) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      });
      const d = await res.json();
      setMsg({ ok: res.ok && d.success, text: d.success ? "Saved. New orders will use these amounts." : d.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white">
      <div className="mx-auto max-w-2xl">
        <Link href="/admin" className="text-xs text-slate-400">
          ← Admin dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold">Commission &amp; courier</h1>
        <p className="mt-1 text-xs text-slate-400">
          Every product in an order is one parcel. Commission and courier charge are worked out for each parcel.
        </p>

        {msg && <p className={`mt-3 rounded-lg p-3 text-sm ${msg.ok ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>{msg.text}</p>}

        {p && (
          <>
            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900 p-4">
              <h2 className="font-bold">Commission per parcel</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <label className="text-xs text-slate-400">
                  Commission %
                  <input type="number" min={0} max={50} step={0.5} className={input} value={p.defaultCommissionRate} onChange={set("defaultCommissionRate")} />
                </label>
                <label className="text-xs text-slate-400">
                  Lowest per parcel (৳)
                  <input type="number" min={0} className={input} value={p.commissionMin} onChange={set("commissionMin")} />
                </label>
                <label className="text-xs text-slate-400">
                  Highest per parcel (৳)
                  <input type="number" min={0} className={input} value={p.commissionMax} onChange={set("commissionMax")} />
                </label>
              </div>

              <div className="mt-4 rounded-xl bg-slate-950 p-3 text-sm">
                <p className="mb-2 text-xs text-slate-400">What you earn on a parcel of:</p>
                {[50, 100, 150, 200, 1000, 5000].map((v) => (
                  <div key={v} className="flex justify-between border-b border-white/5 py-1.5 last:border-0">
                    <span>{money(v)} product</span>
                    <b className="text-emerald-400">{money(computeCommission(v, p.defaultCommissionRate, p.commissionMin, p.commissionMax))}</b>
                  </div>
                ))}
                <p className="mt-2 text-[11px] text-slate-500">
                  A vendor with a special % set in Marketplace → Vendors uses that % with the same lowest / highest limits.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900 p-4">
              <h2 className="font-bold">Courier charge (per product, paid by the customer)</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-slate-400">
                  Inside Dhaka Division (৳)
                  <input type="number" min={0} className={input} value={p.courierInsideDhaka} onChange={set("courierInsideDhaka")} />
                </label>
                <label className="text-xs text-slate-400">
                  Outside Dhaka Division (৳)
                  <input type="number" min={0} className={input} value={p.courierOutsideDhaka} onChange={set("courierOutsideDhaka")} />
                </label>
              </div>
              <p className="mt-3 text-[11px] text-slate-500">
                The vendor delivers by courier, so the courier charge is the vendor&apos;s money. It is never part of your commission.
              </p>
            </div>

            <button onClick={save} disabled={busy} className="mt-4 w-full rounded-xl bg-blue-600 p-3 text-sm font-bold disabled:opacity-60">
              {busy ? "Saving..." : "Save"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
