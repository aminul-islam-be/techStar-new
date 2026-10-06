"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Coupon = {
  _id: string;
  code: string;
  description: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrder: number;
  maxDiscount: number;
  startDate: string | null;
  expiryDate: string;
  usageLimit: number;
  usedCount: number;
  perUserLimit: number;
  isPublic: boolean;
  isActive: boolean;
  status: "active" | "inactive" | "expired" | "used up" | "scheduled";
  totalDiscountGiven: number;
};

type Usage = {
  _id: string;
  orderId: string;
  customer: string;
  phone: string;
  discountAmount: number;
  status: "used" | "released";
  createdAt: string;
};

const EMPTY = {
  code: "",
  description: "",
  discountType: "percentage" as "percentage" | "fixed",
  discountValue: "",
  minOrder: "0",
  maxDiscount: "",
  startDate: "",
  expiryDate: "",
  usageLimit: "100",
  perUserLimit: "1",
  isPublic: true,
};

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-300",
  inactive: "bg-slate-600/30 text-slate-300",
  expired: "bg-red-500/15 text-red-300",
  "used up": "bg-amber-500/15 text-amber-300",
  scheduled: "bg-sky-500/15 text-sky-300",
};

const inputClass =
  "w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500";

const toDateInput = (value: string | null) =>
  value ? new Date(value).toISOString().slice(0, 10) : "";

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [usageFor, setUsageFor] = useState("");
  const [usage, setUsage] = useState<Usage[]>([]);

  async function load() {
    try {
      const response = await fetch("/api/admin/coupons", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load coupons.");
      }

      setCoupons(data.coupons || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load coupons.");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  function set<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startEdit(c: Coupon) {
    setEditingId(c._id);
    setError("");
    setDone("");
    setForm({
      code: c.code,
      description: c.description,
      discountType: c.discountType,
      discountValue: String(c.discountValue),
      minOrder: String(c.minOrder),
      maxDiscount: c.maxDiscount ? String(c.maxDiscount) : "",
      startDate: toDateInput(c.startDate),
      expiryDate: toDateInput(c.expiryDate),
      usageLimit: String(c.usageLimit),
      perUserLimit: String(c.perUserLimit),
      isPublic: c.isPublic,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId("");
    setForm(EMPTY);
    setError("");
  }

  async function save() {
    try {
      setSaving(true);
      setError("");
      setDone("");

      const response = await fetch("/api/admin/coupons", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { ...form, id: editingId } : form),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to save the coupon.");
      }

      setDone(data.message);
      setEditingId("");
      setForm(EMPTY);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save the coupon.");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(c: Coupon) {
    try {
      setError("");
      setDone("");

      const response = await fetch("/api/admin/coupons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c._id, isActive: !c.isActive }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) throw new Error(data.message);

      setDone(data.message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update.");
    }
  }

  async function remove(c: Coupon) {
    if (!window.confirm(`Delete coupon ${c.code}?`)) return;

    try {
      setError("");
      setDone("");

      const response = await fetch(`/api/admin/coupons?id=${c._id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok || !data.success) throw new Error(data.message);

      setDone(data.message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete.");
    }
  }

  async function showUsage(c: Coupon) {
    if (usageFor === c._id) {
      setUsageFor("");
      return;
    }

    try {
      const response = await fetch(`/api/admin/coupons?usage=${c._id}`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok || !data.success) throw new Error(data.message);

      setUsage(data.usage || []);
      setUsageFor(c._id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load usage.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-4xl">
        <Link href="/admin" className="text-sm text-slate-400 hover:text-white">
          ← Admin dashboard
        </Link>

        <h1 className="mt-4 text-3xl font-extrabold">🎟️ Coupons</h1>
        <p className="mt-2 text-sm text-slate-400">
          Customers apply a coupon code at checkout. The discount comes off the
          product price only (not the courier charge) and is paid by the store.
        </p>

        {error && (
          <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            ⚠️ {error}
          </div>
        )}
        {done && (
          <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            ✓ {done}
          </div>
        )}

        {/* ---------- create / edit ---------- */}
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <h2 className="text-lg font-extrabold">
            {editingId ? `Edit coupon ${form.code}` : "Create coupon"}
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold">Coupon code</label>
              <input
                value={form.code}
                onChange={(e) => set("code", e.target.value.toUpperCase().replace(/\s/g, ""))}
                disabled={Boolean(editingId)}
                maxLength={20}
                placeholder="SAVE20"
                className={`${inputClass} font-mono tracking-wider disabled:opacity-50`}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold">Discount type</label>
              <select
                value={form.discountType}
                onChange={(e) => set("discountType", e.target.value as "percentage" | "fixed")}
                className={inputClass}
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed amount (৳)</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold">
                {form.discountType === "percentage" ? "Discount (%)" : "Discount (৳)"}
              </label>
              <input
                type="number"
                min="0"
                value={form.discountValue}
                onChange={(e) => set("discountValue", e.target.value)}
                placeholder={form.discountType === "percentage" ? "20" : "100"}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold">Minimum order (৳)</label>
              <input
                type="number"
                min="0"
                value={form.minOrder}
                onChange={(e) => set("minOrder", e.target.value)}
                className={inputClass}
              />
            </div>

            {form.discountType === "percentage" && (
              <div>
                <label className="mb-1.5 block text-sm font-semibold">
                  Maximum discount (৳) <span className="text-slate-500">optional</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.maxDiscount}
                  onChange={(e) => set("maxDiscount", e.target.value)}
                  placeholder="e.g. 500"
                  className={inputClass}
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-semibold">
                Start date <span className="text-slate-500">optional</span>
              </label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold">Expiry date</label>
              <input
                type="date"
                value={form.expiryDate}
                onChange={(e) => set("expiryDate", e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold">
                Total usage limit <span className="text-slate-500">(0 = unlimited)</span>
              </label>
              <input
                type="number"
                min="0"
                value={form.usageLimit}
                onChange={(e) => set("usageLimit", e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold">
                Uses per customer <span className="text-slate-500">(0 = unlimited)</span>
              </label>
              <input
                type="number"
                min="0"
                value={form.perUserLimit}
                onChange={(e) => set("perUserLimit", e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-semibold">
                Short description <span className="text-slate-500">optional</span>
              </label>
              <input
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                maxLength={120}
                placeholder="e.g. Eid special: 20% off on all products"
                className={inputClass}
              />
            </div>
          </div>

          <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.isPublic}
              onChange={(e) => set("isPublic", e.target.checked)}
              className="h-4 w-4 accent-blue-500"
            />
            Show on customers&apos; Coupons page (untick for a secret code)
          </label>

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold hover:bg-blue-500 disabled:opacity-50"
            >
              {saving ? "Saving..." : editingId ? "Save changes" : "Create coupon"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-bold text-slate-300 hover:bg-white/5"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* ---------- list ---------- */}
        <h2 className="mb-3 mt-10 text-sm font-bold uppercase tracking-wide text-slate-500">
          All coupons ({coupons.length})
        </h2>

        {coupons.length === 0 ? (
          <p className="rounded-xl border border-slate-800 px-4 py-8 text-center text-sm text-slate-500">
            No coupons yet. Create the first one above.
          </p>
        ) : (
          <div className="space-y-3">
            {coupons.map((c) => (
              <div
                key={c._id}
                className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-base font-extrabold tracking-wider">
                    {c.code}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${STATUS_STYLE[c.status]}`}
                  >
                    {c.status}
                  </span>
                  {!c.isPublic && (
                    <span className="rounded-full bg-slate-700 px-2.5 py-0.5 text-[11px] font-bold">
                      secret
                    </span>
                  )}
                </div>

                <p className="mt-1 text-sm text-slate-300">
                  {c.discountType === "percentage"
                    ? `${c.discountValue}% off${c.maxDiscount ? `, up to ৳${c.maxDiscount}` : ""}`
                    : `৳${c.discountValue} off`}
                  {c.minOrder > 0 ? ` · min order ৳${c.minOrder}` : ""}
                </p>
                {c.description && (
                  <p className="text-xs text-slate-500">{c.description}</p>
                )}

                <p className="mt-2 text-xs text-slate-400">
                  Used {c.usedCount}
                  {c.usageLimit > 0 ? ` / ${c.usageLimit}` : " (unlimited)"} ·{" "}
                  {c.perUserLimit > 0 ? `${c.perUserLimit} per customer` : "no per-customer limit"} ·
                  expires {new Date(c.expiryDate).toLocaleDateString("en-GB")} · discount given ৳
                  {c.totalDiscountGiven}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(c)}
                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-bold hover:bg-white/10"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => toggle(c)}
                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-bold hover:bg-white/10"
                  >
                    {c.isActive ? "⏸ Turn off" : "▶ Turn on"}
                  </button>
                  <button
                    type="button"
                    onClick={() => showUsage(c)}
                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-bold hover:bg-white/10"
                  >
                    👥 {usageFor === c._id ? "Hide usage" : "Who used it"}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(c)}
                    className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/10"
                  >
                    🗑 Delete
                  </button>
                </div>

                {usageFor === c._id && (
                  <div className="mt-3 rounded-xl bg-slate-950/60 p-3 text-xs">
                    {usage.length === 0 ? (
                      <p className="text-slate-500">Nobody has used this coupon yet.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {usage.map((u) => (
                          <div
                            key={u._id}
                            className="flex flex-wrap justify-between gap-2 border-b border-slate-800 pb-1.5 last:border-0"
                          >
                            <span>
                              <b>{u.customer}</b> {u.phone && `· ${u.phone}`}
                            </span>
                            <span className="text-slate-400">
                              ৳{u.discountAmount} ·{" "}
                              {u.status === "released" ? "order cancelled" : "used"} ·{" "}
                              {new Date(u.createdAt).toLocaleDateString("en-GB")}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
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
