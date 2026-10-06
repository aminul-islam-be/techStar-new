"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "@/lib/language";
import { getCustomerUserId } from "@/lib/customerAuth";

type Item = {
  _id: string;
  type: "order" | "product" | "offer" | "stock";
  icon: string;
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: string;
};

type Tab = "all" | "order" | "offer" | "stock";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "order", label: "Orders" },
  { key: "offer", label: "Offers" },
  { key: "stock", label: "Stock" },
];

const EMPTY_TABS = {
  all: { total: 0, unread: 0 },
  order: { total: 0, unread: 0 },
  offer: { total: 0, unread: 0 },
  stock: { total: 0, unread: 0 },
};

function defaultIcon(type: string) {
  if (type === "order") return "📦";
  if (type === "offer") return "🎁";
  return "🔔";
}

function timeAgo(value: string) {
  const seconds = Math.max(0, (Date.now() - new Date(value).getTime()) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  if (seconds < 86400 * 7) return `${Math.floor(seconds / 86400)} day ago`;

  return new Date(value).toLocaleDateString("en-GB");
}

// tells the bell icon (BottomNav) to re-count
function pingBell() {
  window.dispatchEvent(new Event("notificationsChange"));
}

export default function NotificationsPage() {
  const { t } = useLanguage();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("all");
  const [items, setItems] = useState<Item[]>([]);
  const [tabs, setTabs] = useState(EMPTY_TABS);
  const [loading, setLoading] = useState(true);
  const [needLogin, setNeedLogin] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (quiet = false) => {
      try {
        if (!quiet) setLoading(true);
        setError("");

        const hasLocalUser = Boolean(getCustomerUserId());
        const response = await fetch(`/api/notifications?type=${tab}`, {
          cache: "no-store",
        });
        const data = await response.json();

        if (response.status === 401) {
          setNeedLogin(!hasLocalUser);
          setSessionExpired(hasLocalUser);
          setItems([]);
          return;
        }

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Unable to load notifications.");
        }

        setNeedLogin(false);
        setSessionExpired(false);
        setItems(data.notifications || []);
        setTabs(data.tabs || EMPTY_TABS);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load notifications."
        );
      } finally {
        setLoading(false);
      }
    },
    [tab]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();

    // new notifications show up without a manual refresh
    const timer = setInterval(() => load(true), 30000);
    const onFocus = () => load(true);
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  async function open(item: Item) {
    if (!item.isRead) {
      setItems((list) =>
        list.map((n) => (n._id === item._id ? { ...n, isRead: true } : n))
      );

      fetch(`/api/notifications/${item._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      })
        .then(() => {
          pingBell();
          load(true);
        })
        .catch(() => {});
    }

    if (item.link) router.push(item.link);
  }

  async function toggleRead(item: Item) {
    try {
      const response = await fetch(`/api/notifications/${item._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: !item.isRead }),
      });
      if (!response.ok) throw new Error();
      await load(true);
      pingBell();
    } catch {
      setError("Unable to update this notification.");
    }
  }

  async function remove(item: Item) {
    try {
      const response = await fetch(`/api/notifications/${item._id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error();
      setItems((list) => list.filter((n) => n._id !== item._id));
      await load(true);
      pingBell();
    } catch {
      setError("Unable to delete this notification.");
    }
  }

  async function markAllRead() {
    try {
      setBusy(true);
      setError("");

      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markAllRead", type: tab }),
      });
      if (!response.ok) throw new Error();

      await load(true);
      pingBell();
    } catch {
      setError("Unable to mark notifications as read.");
    } finally {
      setBusy(false);
    }
  }

  async function clearRead() {
    if (!window.confirm("Delete all notifications you have already read?")) {
      return;
    }

    try {
      setBusy(true);
      setError("");

      const response = await fetch("/api/notifications?scope=read", {
        method: "DELETE",
      });
      if (!response.ok) throw new Error();

      await load(true);
      pingBell();
    } catch {
      setError("Unable to clear notifications.");
    } finally {
      setBusy(false);
    }
  }

  const unreadHere = tabs[tab].unread;
  const readTotal = tabs.all.total - tabs.all.unread;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="text-sm font-medium text-slate-400 hover:text-white"
        >
          {`← ${t("settings.continueShopping")}`}
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            {t("notifications.title")}
            {tabs.all.unread > 0 && (
              <span className="ml-3 rounded-full bg-red-500 px-2.5 py-1 align-middle text-xs font-bold">
                {tabs.all.unread} new
              </span>
            )}
          </h1>

          {!needLogin && !sessionExpired && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={markAllRead}
                disabled={busy || unreadHere === 0}
                className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10 disabled:opacity-40"
              >
                ✓ Mark all as read
              </button>
              <button
                type="button"
                onClick={clearRead}
                disabled={busy || readTotal === 0}
                className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500/10 disabled:opacity-40"
              >
                🗑 Clear read
              </button>
            </div>
          )}
        </div>

        {!needLogin && !sessionExpired && (
          <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
            {TABS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition ${
                  tab === item.key
                    ? "border-blue-500 bg-blue-500/15 text-white"
                    : "border-white/10 text-slate-400 hover:border-white/25"
                }`}
              >
                {item.label}
                {tabs[item.key].unread > 0 && (
                  <span className="rounded-full bg-red-500 px-1.5 text-[10px] font-black text-white">
                    {tabs[item.key].unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <p className="mt-10 text-center text-sm text-slate-400">Loading...</p>
        ) : needLogin || sessionExpired ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-14 text-center">
            <div className="mb-4 text-5xl">🔒</div>
            <h2 className="text-lg font-bold">
              {sessionExpired
                ? "Your login session has expired"
                : "Please login to see notifications"}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {sessionExpired
                ? "Logout and login again, then come back here."
                : "Order updates and offers are linked to your account."}
            </p>
            <Link
              href="/login?redirect=/notifications"
              className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-500"
            >
              Login
            </Link>
          </div>
        ) : items.length === 0 ? (
          <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-20 text-center">
            <div className="mb-4 text-5xl">🔔</div>
            <h2 className="text-lg font-bold text-white">
              {t("notifications.noNew")}
            </h2>
            <p className="mt-2 max-w-sm text-sm text-slate-400">
              {t("notifications.hint")}
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {items.map((item) => (
              <div
                key={item._id}
                className={`group relative flex gap-3 rounded-2xl border p-4 transition ${
                  item.isRead
                    ? "border-white/10 bg-white/[0.02]"
                    : "border-blue-500/40 bg-blue-500/[0.07]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => open(item)}
                  className="flex min-w-0 flex-1 gap-3 text-left"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-xl">
                    {item.icon || defaultIcon(item.type)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3
                        className={`truncate text-sm ${
                          item.isRead ? "font-semibold" : "font-extrabold"
                        }`}
                      >
                        {item.title}
                      </h3>
                      {!item.isRead && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-blue-400" />
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-slate-300">
                      {item.message}
                    </p>
                    <p className="mt-1.5 text-[11px] text-slate-500">
                      {timeAgo(item.createdAt)}
                    </p>
                  </div>
                </button>

                <div className="flex shrink-0 flex-col items-end gap-1">
                  <button
                    type="button"
                    onClick={() => remove(item)}
                    aria-label="Delete notification"
                    className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-red-500/10 hover:text-red-300"
                  >
                    🗑
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleRead(item)}
                    className="rounded-lg px-2 py-1 text-[10px] font-bold text-slate-500 hover:bg-white/10 hover:text-white"
                  >
                    {item.isRead ? "Mark unread" : "Mark read"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
