"use client";

import { useSite } from "@/lib/siteContext";
import Link from "next/link";
import { useState, type FormEvent } from "react";

export default function VendorLoginPage() {
  const { siteName } = useSite();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/vendor/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Login failed.");
      // full reload so the vendor panel loads fresh session data
      window.location.href = "/vendor";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900 p-6">
        <h1 className="text-center text-2xl font-extrabold">Vendor Login</h1>
        <p className="mt-1 text-center text-sm text-slate-400">Manage your shop on {siteName}</p>

        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          type="tel"
          placeholder="Phone number"
          required
          className="mt-6 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm outline-none focus:border-blue-500"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="Password"
          required
          className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm outline-none focus:border-blue-500"
        />

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <button disabled={busy} className="mt-5 w-full rounded-xl bg-blue-600 p-3 text-sm font-bold disabled:opacity-60">
          {busy ? "Signing in..." : "Sign in"}
        </button>

        <p className="mt-4 text-center text-sm text-slate-400">
          New seller?{" "}
          <Link href="/vendor/register" className="font-semibold text-blue-400">
            Create a shop
          </Link>
        </p>
        <p className="mt-2 text-center text-xs">
          <Link href="/" className="text-slate-500">
            ← Back to store
          </Link>
        </p>
      </form>
    </main>
  );
}
