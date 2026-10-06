"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Recent = { title: string; message: string; sentAt: string; count: number };

const TEMPLATES = [
  {
    label: "20% discount",
    title: "20% Discount Today",
    message: "Get 20% off on selected products. Limited time offer!",
    link: "/coupons",
  },
  {
    label: "Free delivery",
    title: "Free Delivery Weekend",
    message: "Enjoy free delivery on your next order this weekend.",
    link: "/",
  },
  {
    label: "New arrivals",
    title: "New Arrivals",
    message: "Fresh products just landed. Come and take a look!",
    link: "/",
  },
];

const inputClass =
  "w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-blue-500";

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [customers, setCustomers] = useState(0);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  async function load() {
    try {
      const response = await fetch("/api/admin/notifications", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load.");
      }

      setCustomers(data.customers || 0);
      setRecent(data.recent || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load.");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function send() {
    if (
      !window.confirm(
        `Send this offer to ${customers} customer${customers === 1 ? "" : "s"}?`
      )
    ) {
      return;
    }

    try {
      setSending(true);
      setError("");
      setDone("");

      const response = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, message, link }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to send.");
      }

      setDone(data.message);
      setTitle("");
      setMessage("");
      setLink("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-2xl">
        <Link href="/admin" className="text-sm text-slate-400 hover:text-white">
          ← Admin dashboard
        </Link>

        <h1 className="mt-4 text-3xl font-extrabold">🔔 Send Offer Notification</h1>
        <p className="mt-2 text-sm text-slate-400">
          This message appears in the Notifications page of all{" "}
          <b className="text-white">{customers}</b> active customers.
          Order and stock notifications are sent automatically.
        </p>

        {error && (
          <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            ⚠️ {error}
          </div>
        )}
        {done && (
          <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            ✓ {done}
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            Quick templates
          </p>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.label}
                type="button"
                onClick={() => {
                  setTitle(tpl.title);
                  setMessage(tpl.message);
                  setLink(tpl.link);
                }}
                className="rounded-full border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-300 hover:border-blue-500"
              >
                {tpl.label}
              </button>
            ))}
          </div>

          <label className="mb-2 mt-5 block text-sm font-semibold">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            placeholder="e.g. 20% Discount Today"
            className={inputClass}
          />

          <label className="mb-2 mt-4 block text-sm font-semibold">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder="Short message customers will read"
            className={`${inputClass} resize-none`}
          />

          <label className="mb-2 mt-4 block text-sm font-semibold">
            Open this page when tapped (optional)
          </label>
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="/coupons or /products/product-slug"
            className={inputClass}
          />

          {(title || message) && (
            <div className="mt-5 flex gap-3 rounded-2xl border border-blue-500/40 bg-blue-500/[0.07] p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-xl">
                🎁
              </div>
              <div>
                <div className="text-sm font-extrabold">{title || "Title"}</div>
                <div className="mt-0.5 text-sm text-slate-300">
                  {message || "Message"}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  Preview · Just now
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={send}
            disabled={sending || title.trim().length < 3 || message.trim().length < 3}
            className="mt-5 w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-40"
          >
            {sending ? "Sending..." : `Send to ${customers} customers`}
          </button>
        </div>

        {recent.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
              Recently sent
            </h2>
            <div className="space-y-2">
              {recent.map((item) => (
                <div
                  key={`${item.title}-${item.sentAt}`}
                  className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm"
                >
                  <div className="font-bold">{item.title}</div>
                  <div className="text-slate-400">{item.message}</div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {new Date(item.sentAt).toLocaleString("en-GB")} · {item.count} customers
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
