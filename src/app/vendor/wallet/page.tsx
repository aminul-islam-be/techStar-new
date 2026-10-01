"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { money, useVendor } from "@/lib/vendorContext";

type Wallet = {
  balance: number;
  pendingPayout: number;
  totalEarned: number;
  totalCommission: number;
  totalWithdrawn: number;
  payoutMethod: { type: string; accountName: string; accountNumber: string; bankName?: string } | null;
};
type Tx = { _id: string; type: string; amount: number; grossAmount?: number; commissionAmount?: number; balanceAfter: number; note?: string; createdAt: string };
type Payout = { _id: string; amount: number; status: string; transactionRef?: string; adminNote?: string; createdAt: string };

const typeLabel: Record<string, string> = {
  sale: "Sale",
  reversal: "Order cancelled",
  withdrawal: "Withdrawal",
  withdrawal_refund: "Withdrawal returned",
  adjustment: "Adjustment",
};

export default function VendorWalletPage() {
  const { vendor } = useVendor();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [min, setMin] = useState(0);
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/vendor/wallet", { cache: "no-store" });
    const d = await res.json();
    if (d.success) {
      setWallet(d.wallet);
      setTxs(d.transactions);
      setPayouts(d.payouts);
      setMin(d.minWithdrawal);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function withdraw() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/vendor/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount) }),
      });
      const d = await res.json();
      setMsg({ ok: res.ok && d.success, text: d.message });
      if (res.ok && d.success) {
        setAmount("");
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  if (!wallet) return <p className="text-slate-400">Loading...</p>;

  const approved = vendor?.status === "approved";

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
        <p className="text-xs text-emerald-200">Available balance</p>
        <p className="mt-1 text-3xl font-extrabold text-emerald-300">{money(wallet.balance)}</p>
        <p className="mt-2 text-xs text-slate-300">
          In review: {money(wallet.pendingPayout)} · Withdrawn: {money(wallet.totalWithdrawn)} · Commission paid:{" "}
          {money(wallet.totalCommission)}
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
        <h2 className="font-bold">Withdraw money</h2>
        {!wallet.payoutMethod ? (
          <p className="mt-2 text-sm text-amber-300">
            Add your bKash / Nagad / bank details first in{" "}
            <Link href="/vendor/profile" className="underline">
              Profile
            </Link>
            .
          </p>
        ) : (
          <>
            <p className="mt-1 text-xs text-slate-400">
              Goes to {wallet.payoutMethod.type.toUpperCase()} · {wallet.payoutMethod.accountNumber} (
              {wallet.payoutMethod.accountName}). Minimum {money(min)}.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                type="number"
                min={0}
                placeholder="Amount"
                className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm outline-none focus:border-blue-500"
              />
              <button
                onClick={withdraw}
                disabled={busy || !approved || !amount}
                className="rounded-xl bg-blue-600 px-5 text-sm font-bold disabled:opacity-50"
              >
                {busy ? "..." : "Request"}
              </button>
            </div>
            <button onClick={() => setAmount(String(wallet.balance))} className="mt-2 text-xs text-blue-400">
              Withdraw everything ({money(wallet.balance)})
            </button>
          </>
        )}
        {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</p>}
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
        <h2 className="mb-2 font-bold">Withdrawal requests</h2>
        {payouts.length === 0 ? (
          <p className="text-sm text-slate-400">None yet.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {payouts.map((p) => (
              <div key={p._id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="font-semibold">{money(p.amount)}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(p.createdAt).toLocaleDateString()}
                    {p.transactionRef ? ` · Txn ${p.transactionRef}` : ""}
                    {p.adminNote ? ` · ${p.adminNote}` : ""}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${
                    p.status === "paid"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : p.status === "rejected"
                      ? "bg-red-500/20 text-red-300"
                      : "bg-amber-500/20 text-amber-300"
                  }`}
                >
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
        <h2 className="mb-2 font-bold">Wallet history</h2>
        {txs.length === 0 ? (
          <p className="text-sm text-slate-400">No transactions yet.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {txs.map((t) => (
              <div key={t._id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold">{typeLabel[t.type] || t.type}</p>
                  <p className="truncate text-xs text-slate-500">
                    {t.note}
                    {t.type === "sale" && t.grossAmount != null
                      ? ` · sale ${money(t.grossAmount)}, commission ${money(t.commissionAmount)}`
                      : ""}
                  </p>
                  <p className="text-[11px] text-slate-600">{new Date(t.createdAt).toLocaleString()}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`font-bold ${t.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {t.amount >= 0 ? "+" : "-"}
                    {money(Math.abs(t.amount))}
                  </p>
                  <p className="text-[11px] text-slate-500">Bal {money(t.balanceAfter)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
