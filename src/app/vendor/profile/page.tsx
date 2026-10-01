"use client";

import { useEffect, useState } from "react";
import { useVendor } from "@/lib/vendorContext";

const field =
  "w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white outline-none focus:border-blue-500";

export default function VendorProfilePage() {
  const { vendor, refresh } = useVendor();
  const [form, setForm] = useState({
    shopName: "",
    ownerName: "",
    email: "",
    address: "",
    description: "",
    payType: "bkash",
    accountName: "",
    accountNumber: "",
    bankName: "",
  });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!vendor) return;
    setForm({
      shopName: vendor.shopName || "",
      ownerName: vendor.ownerName || "",
      email: vendor.email || "",
      address: vendor.address || "",
      description: vendor.description || "",
      payType: vendor.payoutMethod?.type || "bkash",
      accountName: vendor.payoutMethod?.accountName || "",
      accountNumber: vendor.payoutMethod?.accountNumber || "",
      bankName: vendor.payoutMethod?.bankName || "",
    });
  }, [vendor]);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const payload: Record<string, unknown> = {
        shopName: form.shopName,
        ownerName: form.ownerName,
        email: form.email,
        address: form.address,
        description: form.description,
      };
      if (form.accountNumber.trim()) {
        payload.payoutMethod = {
          type: form.payType,
          accountName: form.accountName,
          accountNumber: form.accountNumber,
          bankName: form.bankName,
        };
      }
      const res = await fetch("/api/vendor/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      setMsg({ ok: res.ok && d.success, text: d.success ? "Saved." : d.message });
      if (d.success) await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
        <h2 className="mb-3 font-bold">Shop details</h2>
        <div className="space-y-3">
          <input className={field} placeholder="Shop name" value={form.shopName} onChange={set("shopName")} />
          <input className={field} placeholder="Owner name" value={form.ownerName} onChange={set("ownerName")} />
          <input className={field} placeholder="Email" value={form.email} onChange={set("email")} />
          <input className={field} placeholder="Address" value={form.address} onChange={set("address")} />
          <textarea className={field} rows={3} placeholder="About your shop" value={form.description} onChange={set("description")} />
          <p className="text-xs text-slate-500">Login phone: {vendor?.phone}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
        <h2 className="mb-1 font-bold">Where should we send your money?</h2>
        <p className="mb-3 text-xs text-slate-400">Withdrawals are sent to this account.</p>
        <div className="space-y-3">
          <select className={field} value={form.payType} onChange={set("payType")}>
            <option value="bkash">bKash</option>
            <option value="nagad">Nagad</option>
            <option value="rocket">Rocket</option>
            <option value="bank">Bank account</option>
          </select>
          <input className={field} placeholder="Account holder name" value={form.accountName} onChange={set("accountName")} />
          <input
            className={field}
            placeholder={form.payType === "bank" ? "Bank account number" : "Mobile wallet number"}
            value={form.accountNumber}
            onChange={set("accountNumber")}
          />
          {form.payType === "bank" && (
            <input className={field} placeholder="Bank name & branch" value={form.bankName} onChange={set("bankName")} />
          )}
        </div>
      </div>

      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</p>}
      <button onClick={save} disabled={busy} className="w-full rounded-xl bg-blue-600 p-3 text-sm font-bold disabled:opacity-60">
        {busy ? "Saving..." : "Save changes"}
      </button>
    </div>
  );
}
