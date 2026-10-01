"use client";

import { useState } from "react";

const money = (n: number) => "৳" + Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });

/**
 * Pay the commission due (or more, as advance) on the SSLCommerz page,
 * where bKash, Nagad, Rocket and cards are available.
 */
export default function BillingPay({ due }: { due: number }) {
  const min = due > 0 ? due : 100;
  const [amount, setAmount] = useState(String(min));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pay() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/vendor/billing/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount) }),
      });
      const d = await res.json();
      if (!res.ok || !d.success) throw new Error(d.message || "Unable to start the payment.");
      window.location.href = d.gatewayUrl; // go to the payment page
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to start the payment.");
      setBusy(false);
    }
  }

  return (
    <div>
      <label className="text-xs text-slate-400">
        {due > 0 ? `Amount (minimum ${money(due)}, pay more to keep an advance)` : "Advance amount (minimum ৳100)"}
      </label>
      <input
        type="number"
        min={min}
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-base font-bold text-white outline-none focus:border-blue-500"
      />
      {error && <p className="mt-2 rounded-lg bg-red-500/10 p-2.5 text-xs text-red-300">{error}</p>}
      <button
        onClick={pay}
        disabled={busy || !amount || Number(amount) < min}
        className="mt-3 w-full rounded-xl bg-emerald-600 p-3.5 text-sm font-bold text-white disabled:opacity-50"
      >
        {busy ? "Opening payment page..." : `Pay Now ${money(Number(amount) || 0)}`}
      </button>
      <p className="mt-2 text-center text-[11px] text-slate-500">bKash · Nagad · Rocket · Cards (secure SSLCommerz page)</p>
    </div>
  );
}
