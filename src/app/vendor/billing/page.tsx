"use client";

import { useSite } from "@/lib/siteContext";
import { useEffect, useState } from "react";
import BillingPay from "@/components/BillingPay";
import { money, useVendor } from "@/lib/vendorContext";

type Billing = { due: number; credit: number; locked: boolean; graceDays: number; nextLockDate: string };
type Entry = { _id: string; type: string; amount: number; dueAfter: number; creditAfter: number; note?: string; createdAt: string };
type Pay = { _id: string; amount: number; status: string; gateway: string; gatewayRef?: string; createdAt: string };

const label: Record<string, string> = {
  accrual: "Commission added",
  reversal: "Commission returned",
  payment: "Payment",
  waiver: "Unlocked by admin",
};

export default function VendorBillingPage() {
  const { refresh } = useVendor();
  const { siteName } = useSite();
  const [billing, setBilling] = useState<Billing | null>(null);
  const [ledger, setLedger] = useState<Entry[]>([]);
  const [payments, setPayments] = useState<Pay[]>([]);
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("payment");
    if (p === "success") setFlash({ ok: true, text: "Payment received. Thank you!" });
    if (p === "failed") setFlash({ ok: false, text: "The payment was not completed. You were not charged for this attempt." });
    if (p === "cancelled") setFlash({ ok: false, text: "Payment cancelled." });

    fetch("/api/vendor/billing", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setBilling(d.billing);
          setLedger(d.ledger);
          setPayments(d.payments);
        }
      });
    if (p === "success") refresh(); // pick up the unlocked state
  }, [refresh]);

  if (!billing) return <p className="text-slate-400">Loading...</p>;

  return (
    <div className="space-y-5">
      {flash && (
        <p className={`rounded-xl p-3 text-sm ${flash.ok ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-200"}`}>
          {flash.text}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
          <p className="text-xs text-slate-400">Commission due</p>
          <p className={`mt-1 text-2xl font-extrabold ${billing.due > 0 ? "text-red-300" : "text-emerald-400"}`}>{money(billing.due)}</p>
          {billing.due > 0 && <p className="mt-1 text-[11px] text-slate-500">Shop locks on {billing.nextLockDate} if unpaid</p>}
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
          <p className="text-xs text-slate-400">Advance credit</p>
          <p className="mt-1 text-2xl font-extrabold">{money(billing.credit)}</p>
          <p className="mt-1 text-[11px] text-slate-500">Used automatically for future commission</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
        <h2 className="mb-1 font-bold">{billing.due > 0 ? "Pay your commission" : "Add advance (optional)"}</h2>
        <p className="mb-3 text-xs text-slate-400">
          For Cash on Delivery orders you collect the money, so {siteName}&apos;s commission is paid by you, once a month.
        </p>
        <BillingPay due={billing.due} />
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
        <h2 className="mb-2 font-bold">Payments</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-slate-400">No payments yet.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {payments.map((p) => (
              <div key={p._id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="font-semibold">{money(p.amount)}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(p.createdAt).toLocaleString()} {p.gatewayRef ? `· ${p.gatewayRef}` : ""}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${
                    p.status === "paid" ? "bg-emerald-500/20 text-emerald-300" : p.status === "pending" ? "bg-amber-500/20 text-amber-300" : "bg-red-500/20 text-red-300"
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
        <h2 className="mb-2 font-bold">Commission history</h2>
        {ledger.length === 0 ? (
          <p className="text-sm text-slate-400">Nothing yet. Commission is added when a Cash on Delivery order is delivered.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {ledger.map((e) => (
              <div key={e._id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold">{label[e.type] || e.type}</p>
                  <p className="truncate text-xs text-slate-500">{e.note}</p>
                  <p className="text-[11px] text-slate-600">{new Date(e.createdAt).toLocaleString()}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`font-bold ${e.type === "accrual" ? "text-red-300" : "text-emerald-400"}`}>
                    {e.type === "accrual" ? "+" : e.type === "waiver" ? "" : "-"}
                    {money(e.amount)}
                  </p>
                  <p className="text-[11px] text-slate-500">Due {money(e.dueAfter)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
