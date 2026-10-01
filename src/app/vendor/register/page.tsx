"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

const field =
  "w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white outline-none focus:border-blue-500";

export default function VendorRegisterPage() {
  const [form, setForm] = useState({ shopName: "", ownerName: "", phone: "", email: "", address: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/vendor/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Registration failed.");
      window.location.href = "/vendor";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8 text-white">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6">
        <h1 className="text-center text-2xl font-extrabold">Sell on TechStar</h1>
        <p className="mt-1 text-center text-sm text-slate-400">
          Open your shop, list products and get paid for every sale. TechStar keeps a small commission per sale.
        </p>

        <div className="mt-6 space-y-3">
          <input className={field} placeholder="Shop name *" value={form.shopName} onChange={set("shopName")} required />
          <input className={field} placeholder="Your full name *" value={form.ownerName} onChange={set("ownerName")} required />
          <input className={field} type="tel" placeholder="Phone number *" value={form.phone} onChange={set("phone")} required />
          <input className={field} type="email" placeholder="Email (optional)" value={form.email} onChange={set("email")} />
          <input className={field} placeholder="Shop address" value={form.address} onChange={set("address")} />
          <input
            className={field}
            type="password"
            placeholder="Password (min 6 characters) *"
            value={form.password}
            onChange={set("password")}
            minLength={6}
            required
          />
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <button disabled={busy} className="mt-5 w-full rounded-xl bg-blue-600 p-3 text-sm font-bold disabled:opacity-60">
          {busy ? "Creating..." : "Create my shop"}
        </button>

        <p className="mt-4 text-center text-sm text-slate-400">
          Already a vendor?{" "}
          <Link href="/vendor/login" className="font-semibold text-blue-400">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
