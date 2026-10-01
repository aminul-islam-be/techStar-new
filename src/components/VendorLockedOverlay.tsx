"use client";

import { useEffect, useState } from "react";
import BillingPay from "@/components/BillingPay";

const money = (n: number) => "৳" + Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });

/** Covers the whole screen. There is no close button on purpose. */
export default function VendorLockedOverlay({ due, onLogout }: { due: number; onLogout: () => void }) {
  const [flash, setFlash] = useState("");

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("payment");
    if (p === "failed") setFlash("পেমেন্ট সম্পন্ন হয়নি। অনুগ্রহ করে আবার চেষ্টা করুন।");
    if (p === "cancelled") setFlash("পেমেন্ট বাতিল করা হয়েছে। সার্ভিস চালু করতে বকেয়া পরিশোধ করুন।");
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/95 p-4 backdrop-blur"
    >
      <div className="w-full max-w-md rounded-3xl border border-red-500/30 bg-slate-900 p-6 text-white shadow-2xl">
        <p className="text-center text-4xl">🔒</p>
        <h1 className="mt-2 text-center text-xl font-extrabold">আপনার শপ লক করা হয়েছে</h1>

        <p className="mt-4 text-center text-sm leading-relaxed text-slate-200">
          আপনার গত মাসের COD কমিশন বাবদ <b className="text-lg text-red-300">{money(due)}</b> টাকা বকেয়া রয়েছে। সার্ভিস চালু
          রাখতে অনুগ্রহ করে বকেয়া পরিশোধ করুন।
        </p>
        <p className="mt-1 text-center text-[11px] text-slate-500">
          Your COD commission of {money(due)} is overdue. Pay it to unlock your shop.
        </p>

        {flash && <p className="mt-3 rounded-lg bg-amber-500/10 p-2.5 text-center text-xs text-amber-200">{flash}</p>}

        <div className="mt-5">
          <BillingPay due={due} />
        </div>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-500">
          পেমেন্ট সফল হলে শপ নিজে থেকেই চালু হয়ে যাবে। বকেয়ার বেশি দিলে অতিরিক্ত টাকা অ্যাডভান্স হিসেবে জমা থাকবে এবং পরের
          মাসের কমিশনের সাথে মিলে যাবে।
        </p>

        <button onClick={onLogout} className="mt-4 w-full text-center text-xs text-slate-500 underline">
          Logout
        </button>
      </div>
    </div>
  );
}
