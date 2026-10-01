"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Vendor = {
  _id: string;
  shopName: string;
  ownerName: string;
  phone: string;
  status: string;
  commissionRate: number | null;
  balance: number;
  pendingPayout: number;
  totalSales: number;
  totalCommission: number;
  totalWithdrawn: number;
  createdAt: string;
};
type Prod = { _id: string; name: string; vendorName?: string; category: string; price: number; stock: number; image?: string; description?: string; approvalStatus?: string };
type Payout = {
  _id: string;
  amount: number;
  status: string;
  createdAt: string;
  method: { type: string; accountName: string; accountNumber: string; bankName?: string };
  vendorId: { shopName: string; ownerName: string; phone: string } | null;
};
type Settings = { defaultCommissionRate: number; minWithdrawal: number; autoApproveVendors: boolean; autoApproveProducts: boolean };
type Summary = {
  platformCommission: number;
  vendorSales: number;
  vendorShare: number;
  owedToVendors: number;
  paidOut: number;
  pendingVendors: number;
  pendingProducts: number;
  pendingPayouts: number;
};

const money = (n: number | undefined | null) => "৳" + Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
const input = "rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500";

async function api(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error("Please login as admin first (/admin/login), then reopen this page.");
  if (!res.ok || data.success === false) throw new Error(data.message || "Request failed.");
  return data;
}

export default function AdminMarketplacePage() {
  const [tab, setTab] = useState<"earnings" | "vendors" | "products" | "payouts">("earnings");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [defaultRate, setDefaultRate] = useState(10);
  const [vendorFilter, setVendorFilter] = useState("pending");
  const [products, setProducts] = useState<Prod[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [payoutFilter, setPayoutFilter] = useState("pending");
  const [rates, setRates] = useState<Record<string, string>>({});
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

  const loadSettings = useCallback(() => run(async () => {
    const d = await api("/api/admin/marketplace/settings", "GET");
    setSettings(d.settings);
    setSummary(d.summary);
  }), [run]);

  const loadVendors = useCallback(() => run(async () => {
    const d = await api(`/api/admin/marketplace/vendors?status=${vendorFilter}`, "GET");
    setVendors(d.vendors);
    setDefaultRate(d.defaultCommissionRate);
  }), [run, vendorFilter]);

  const loadProducts = useCallback(() => run(async () => {
    const d = await api("/api/admin/marketplace/products?status=pending", "GET");
    setProducts(d.products);
  }), [run]);

  const loadPayouts = useCallback(() => run(async () => {
    const d = await api(`/api/admin/marketplace/payouts?status=${payoutFilter}`, "GET");
    setPayouts(d.payouts);
  }), [run, payoutFilter]);

  useEffect(() => { loadSettings(); }, [loadSettings]);
  useEffect(() => { if (tab === "vendors") loadVendors(); }, [tab, loadVendors]);
  useEffect(() => { if (tab === "products") loadProducts(); }, [tab, loadProducts]);
  useEffect(() => { if (tab === "payouts") loadPayouts(); }, [tab, loadPayouts]);

  const flash = (t: string) => { setNote(t); setTimeout(() => setNote(""), 2500); };

  const saveSettings = () => run(async () => {
    if (!settings) return;
    const d = await api("/api/admin/marketplace/settings", "PUT", settings);
    setSettings(d.settings);
    flash("Settings saved.");
  });

  const vendorUpdate = (id: string, patch: Record<string, unknown>) => run(async () => {
    await api("/api/admin/marketplace/vendors", "PATCH", { id, ...patch });
    flash("Vendor updated.");
    await Promise.all([loadVendors(), loadSettings()]);
  });

  const productAction = (id: string, action: "approve" | "reject") => run(async () => {
    const reason = action === "reject" ? prompt("Reason for rejecting (the vendor will see this):") || "" : "";
    await api("/api/admin/marketplace/products", "PATCH", { id, action, reason });
    await Promise.all([loadProducts(), loadSettings()]);
  });

  const payoutAction = (id: string, action: "paid" | "reject") => run(async () => {
    let transactionRef = "";
    let adminNote = "";
    if (action === "paid") {
      transactionRef = prompt("Enter the bKash / Nagad / bank transaction ID you paid with:") || "";
      if (!transactionRef.trim()) return;
    } else {
      adminNote = prompt("Reason for rejecting (money returns to the vendor wallet):") || "";
    }
    await api("/api/admin/marketplace/payouts", "PATCH", { id, action, transactionRef, adminNote });
    await Promise.all([loadPayouts(), loadSettings()]);
  });

  const tabs = [
    { key: "earnings", label: "💰 Earnings & Settings", count: 0 },
    { key: "vendors", label: "🏪 Vendors", count: summary?.pendingVendors || 0 },
    { key: "products", label: "📦 Product review", count: summary?.pendingProducts || 0 },
    { key: "payouts", label: "💸 Payouts", count: summary?.pendingPayouts || 0 },
  ] as const;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white">
      <div className="mx-auto max-w-5xl">
        <Link href="/admin" className="text-xs text-slate-400">← Admin dashboard</Link>
        <div className="mt-2 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold">Marketplace</h1>
          <Link href="/admin/chats" className="rounded-lg border border-white/10 px-3 py-2 text-xs">💬 Chat monitor</Link>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold ${tab === t.key ? "bg-blue-600" : "bg-slate-900 text-slate-300"}`}
            >
              {t.label}
              {t.count > 0 && <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px]">{t.count}</span>}
            </button>
          ))}
        </div>

        {error && <p className="mt-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
        {note && <p className="mt-3 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-300">{note}</p>}

        {/* ---------------- EARNINGS & SETTINGS ---------------- */}
        {tab === "earnings" && summary && settings && (
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
              <p className="text-xs text-emerald-200">Your commission earnings (platform account)</p>
              <p className="mt-1 text-3xl font-extrabold text-emerald-300">{money(summary.platformCommission)}</p>
              <p className="mt-1 text-xs text-slate-300">From {money(summary.vendorSales)} of delivered &amp; paid vendor sales.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {[
                ["Vendors' share earned", money(summary.vendorShare)],
                ["Currently owed to vendors", money(summary.owedToVendors)],
                ["Already paid to vendors", money(summary.paidOut)],
              ].map(([l, v]) => (
                <div key={l} className="rounded-2xl border border-white/10 bg-slate-900 p-4">
                  <p className="text-xs text-slate-400">{l}</p>
                  <p className="mt-1 text-lg font-bold">{v}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
              <h2 className="font-bold">Marketplace settings</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="text-xs text-slate-400">
                  Default commission % (suggested 5 to 10)
                  <input type="number" min={0} max={50} step={0.5} className={`${input} mt-1 w-full`} value={settings.defaultCommissionRate}
                    onChange={(e) => setSettings({ ...settings, defaultCommissionRate: Number(e.target.value) })} />
                </label>
                <label className="text-xs text-slate-400">
                  Minimum withdrawal (৳)
                  <input type="number" min={0} className={`${input} mt-1 w-full`} value={settings.minWithdrawal}
                    onChange={(e) => setSettings({ ...settings, minWithdrawal: Number(e.target.value) })} />
                </label>
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={settings.autoApproveVendors} onChange={(e) => setSettings({ ...settings, autoApproveVendors: e.target.checked })} />
                Auto-approve new vendors
              </label>
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={settings.autoApproveProducts} onChange={(e) => setSettings({ ...settings, autoApproveProducts: e.target.checked })} />
                Auto-approve vendor products (no review)
              </label>
              <p className="mt-3 text-xs text-slate-500">
                A change to the default rate applies to new orders only. Old orders keep the rate they were placed with. You can
                give a single vendor a different rate in the Vendors tab.
              </p>
              <button onClick={saveSettings} className="mt-3 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold">Save settings</button>
            </div>
          </div>
        )}

        {/* ---------------- VENDORS ---------------- */}
        {tab === "vendors" && (
          <div className="mt-4 space-y-3">
            <select className={input} value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)}>
              {["pending", "approved", "suspended", "rejected", ""].map((s) => (
                <option key={s} value={s}>{s ? s[0].toUpperCase() + s.slice(1) : "All"}</option>
              ))}
            </select>
            {vendors.length === 0 && <p className="text-sm text-slate-400">No vendors here.</p>}
            {vendors.map((v) => (
              <div key={v._id} className="rounded-2xl border border-white/10 bg-slate-900 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">{v.shopName}</p>
                    <p className="text-xs text-slate-400">{v.ownerName} · {v.phone}</p>
                  </div>
                  <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-semibold capitalize">{v.status}</span>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Sales {money(v.totalSales)} · Commission {money(v.totalCommission)} · Wallet {money(v.balance)} · In review {money(v.pendingPayout)} · Paid {money(v.totalWithdrawn)}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    type="number" min={0} max={50} step={0.5}
                    placeholder={`Rate % (default ${defaultRate})`}
                    className={`${input} w-40`}
                    value={rates[v._id] ?? (v.commissionRate ?? "")}
                    onChange={(e) => setRates({ ...rates, [v._id]: e.target.value })}
                  />
                  <button
                    onClick={() => vendorUpdate(v._id, { commissionRate: (rates[v._id] ?? "") === "" ? null : Number(rates[v._id]) })}
                    className="rounded-lg border border-white/10 px-3 py-2 text-xs"
                  >
                    Save rate
                  </button>
                  {v.status !== "approved" && (
                    <button onClick={() => vendorUpdate(v._id, { status: "approved" })} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold">Approve</button>
                  )}
                  {v.status === "pending" && (
                    <button onClick={() => vendorUpdate(v._id, { status: "rejected" })} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold">Reject</button>
                  )}
                  {v.status === "approved" && (
                    <button onClick={() => vendorUpdate(v._id, { status: "suspended" })} className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold">Suspend</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ---------------- PRODUCT REVIEW ---------------- */}
        {tab === "products" && (
          <div className="mt-4 space-y-3">
            {products.length === 0 && <p className="text-sm text-slate-400">No vendor products waiting for review.</p>}
            {products.map((p) => (
              <div key={p._id} className="rounded-2xl border border-white/10 bg-slate-900 p-4">
                <div className="flex gap-3">
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt="" className="h-20 w-20 rounded-xl bg-white/5 object-contain" />
                  ) : (
                    <div className="h-20 w-20 rounded-xl bg-white/5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-xs text-slate-400">by {p.vendorName} · {p.category}</p>
                    <p className="text-sm">{money(p.price)} · Stock {p.stock}</p>
                    {p.description && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{p.description}</p>}
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => productAction(p._id, "approve")} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold">Approve &amp; publish</button>
                  <button onClick={() => productAction(p._id, "reject")} className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold">Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ---------------- PAYOUTS ---------------- */}
        {tab === "payouts" && (
          <div className="mt-4 space-y-3">
            <select className={input} value={payoutFilter} onChange={(e) => setPayoutFilter(e.target.value)}>
              {["pending", "paid", "rejected", ""].map((s) => (
                <option key={s} value={s}>{s ? s[0].toUpperCase() + s.slice(1) : "All"}</option>
              ))}
            </select>
            {payouts.length === 0 && <p className="text-sm text-slate-400">No withdrawal requests here.</p>}
            {payouts.map((p) => (
              <div key={p._id} className="rounded-2xl border border-white/10 bg-slate-900 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">{p.vendorId?.shopName || "Vendor"} · {money(p.amount)}</p>
                    <p className="text-xs text-slate-400">{p.vendorId?.ownerName} · {p.vendorId?.phone}</p>
                  </div>
                  <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-semibold capitalize">{p.status}</span>
                </div>
                <p className="mt-2 rounded-lg bg-slate-950 p-2.5 text-sm">
                  Send to <b className="uppercase">{p.method.type}</b>: <b>{p.method.accountNumber}</b> ({p.method.accountName}
                  {p.method.bankName ? `, ${p.method.bankName}` : ""})
                </p>
                <p className="mt-1 text-[11px] text-slate-500">Requested {new Date(p.createdAt).toLocaleString()}</p>
                {p.status === "pending" && (
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => payoutAction(p._id, "paid")} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold">Mark as paid</button>
                    <button onClick={() => payoutAction(p._id, "reject")} className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold">Reject</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
