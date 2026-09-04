"use client";

import Link from "next/link";

export default function AddressesPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="text-sm font-medium text-slate-400 hover:text-white"
        >
          {"← Continue Shopping"}
        </Link>

        <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
          ঠিকানা বুক (Saved Addresses)
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          দ্রুত চেকআউটের জন্য আপনার ডেলিভারি ঠিকানাগুলো এখানে সেভ রাখুন।
        </p>

        <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-20 text-center">
          <div className="mb-4 text-5xl">📍</div>
          <h2 className="text-lg font-bold text-white">
            কোনো সেভ করা ঠিকানা নেই
          </h2>
          <p className="mt-2 max-w-sm text-sm text-slate-400">
            চেকআউটের সময় দেওয়া ঠিকানা এখানে সেভ করে রাখা যাবে (শীঘ্রই আসছে)।
          </p>
          <Link
            href="/profile"
            className="mt-6 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500"
          >
            প্রোফাইলে যান
          </Link>
        </div>
      </div>
    </main>
  );
}
