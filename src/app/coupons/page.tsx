"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/language";
import { getCustomerUserId } from "@/lib/customerAuth";

type CouponItem = {
  _id: string;
  code: string;
  description: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrder: number;
  maxDiscount: number;
  expiryDate: string;
  alreadyUsed: boolean;
};

function offText(c: CouponItem) {
  return c.discountType === "percentage"
    ? `${c.discountValue}% OFF`
    : `৳${c.discountValue} OFF`;
}

function expiryText(value: string) {
  const days = Math.ceil((new Date(value).getTime() - Date.now()) / 86400000);

  if (days <= 0) return "Expires today";
  if (days === 1) return "Expires tomorrow";
  if (days <= 7) return `Expires in ${days} days`;

  return `Valid till ${new Date(value).toLocaleDateString("en-GB")}`;
}

export default function CouponsPage() {
  const { t } = useLanguage();

  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    const userId = getCustomerUserId();

    fetch("/api/coupons", {
      cache: "no-store",
      headers: userId ? { "x-user-id": userId } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) throw new Error(data.message || "Unable to load coupons.");
        setCoupons(data.coupons || []);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Unable to load coupons.")
      )
      .finally(() => setLoading(false));
  }, []);

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      /* some browsers block clipboard: the code is still visible */
    }
    setCopied(code);
    setTimeout(() => setCopied(""), 2000);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/account"
          className="text-sm font-medium text-slate-400 hover:text-white"
        >
          ← My Account
        </Link>

        <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
          🎟️ {t("account.coupons")}
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Copy a code and paste it in the Coupon box at checkout.
        </p>

        {error && (
          <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <p className="mt-10 text-center text-sm text-slate-400">Loading...</p>
        ) : coupons.length === 0 ? (
          <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-20 text-center">
            <div className="mb-4 text-5xl">🎟️</div>
            <h2 className="text-lg font-bold text-white">No coupons right now</h2>
            <p className="mt-2 max-w-sm text-sm text-slate-400">
              New offers will appear here. Check back soon!
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {coupons.map((c) => (
              <div
                key={c._id}
                className={`overflow-hidden rounded-2xl border ${
                  c.alreadyUsed
                    ? "border-white/10 opacity-60"
                    : "border-amber-500/30"
                } bg-white/[0.03]`}
              >
                <div className="flex">
                  <div className="flex w-28 shrink-0 flex-col items-center justify-center bg-gradient-to-br from-amber-500 to-orange-600 px-2 py-5 text-center sm:w-36">
                    <div className="text-lg font-black leading-tight sm:text-xl">
                      {offText(c)}
                    </div>
                    {c.discountType === "percentage" && c.maxDiscount > 0 && (
                      <div className="mt-1 text-[10px] font-semibold opacity-90">
                        up to ৳{c.maxDiscount}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 p-4">
                    {c.description && (
                      <p className="text-sm font-semibold">{c.description}</p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-lg border border-dashed border-amber-400/60 bg-amber-400/10 px-3 py-1.5 font-mono text-sm font-extrabold tracking-wider text-amber-300">
                        {c.code}
                      </span>

                      {c.alreadyUsed ? (
                        <span className="rounded-full bg-slate-700 px-2.5 py-1 text-[11px] font-bold">
                          Already used
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => copy(c.code)}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold hover:bg-blue-500"
                        >
                          {copied === c.code ? "✓ Copied" : "Copy"}
                        </button>
                      )}
                    </div>

                    <p className="mt-2 text-xs text-slate-400">
                      {c.minOrder > 0
                        ? `Min. order ৳${c.minOrder}`
                        : "No minimum order"}
                      {" · "}
                      {expiryText(c.expiryDate)}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            <Link
              href="/cart"
              className="mt-2 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold hover:bg-blue-500"
            >
              Go to cart and use a coupon
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
