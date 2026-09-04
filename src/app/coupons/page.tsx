"use client";

import Link from "next/link";

export default function CouponsPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/account"
          className="text-sm font-medium text-slate-400 hover:text-white"
        >
          {"← My Account"}
        </Link>

        <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
          কুপন ও ভাউচার (Coupons)
        </h1>

        <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-20 text-center">
          <div className="mb-4 text-5xl">🎟️</div>
          <h2 className="text-lg font-bold text-white">
            এখনো কোনো কুপন নেই
          </h2>
          <p className="mt-2 max-w-sm text-sm text-slate-400">
            নতুন অফার আর ডিসকাউন্ট কুপন এখানে দেখা যাবে।
          </p>
        </div>
      </div>
    </main>
  );
}
