"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCustomerUser, getCustomerUserId } from "@/lib/customerAuth";
import { useCurrency } from "@/lib/useCurrency";
import { useLanguage } from "@/lib/language";

type ViewedItem = {
  _id: string;
  at: string;
  product: {
    _id: string;
    name: string;
    slug: string;
    image?: string;
    price: number;
    stock: number;
  } | null;
};

type SearchItem = {
  _id: string;
  query: string;
  at: string;
};

type OrderItem = {
  _id: string;
  status?: string;
  totalAmount: number;
  createdAt?: string;
};

export default function HistoryPage() {
  const router = useRouter();
  const { format } = useCurrency();
  const { t, language } = useLanguage();

  const [tab, setTab] = useState<"viewed" | "search" | "orders">(
    "viewed"
  );
  const [viewed, setViewed] = useState<ViewedItem[]>([]);
  const [searchItems, setSearchItems] = useState<SearchItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [retentionDays, setRetentionDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [savingRetention, setSavingRetention] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const user = getCustomerUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    loadAll(user.id);
  }, []);

  async function loadAll(userId: string) {
    try {
      setLoading(true);
      setError("");

      const [historyRes, ordersRes] = await Promise.all([
        fetch("/api/history", {
          headers: { "x-user-id": userId },
          cache: "no-store",
        }),
        fetch("/api/orders", {
          headers: { "x-user-id": userId },
          cache: "no-store",
        }),
      ]);

      const historyData = await historyRes.json();

      if (!historyRes.ok || !historyData.success) {
        throw new Error(
          historyData.message || t("history.unableToLoad")
        );
      }

      setViewed(
        Array.isArray(historyData.viewed) ? historyData.viewed : []
      );
      setSearchItems(
        Array.isArray(historyData.search) ? historyData.search : []
      );
      setRetentionDays(historyData.retentionDays || 30);

      const ordersData = await ordersRes.json();

      if (ordersRes.ok && ordersData.success) {
        setOrders(
          Array.isArray(ordersData.orders) ? ordersData.orders : []
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("history.unableToLoad")
      );
    } finally {
      setLoading(false);
    }
  }

  async function updateRetention(days: number) {
    const userId = getCustomerUserId();

    if (!userId || days === retentionDays) return;

    setSavingRetention(true);

    try {
      const response = await fetch("/api/history/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({ retentionDays: days }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setRetentionDays(days);
        setError("");
      } else {
        setError(
          data.message || t("history.unableToLoad")
        );
      }
    } catch (err) {
      console.error(err);
      setError(t("history.unableToLoad"));
    } finally {
      setSavingRetention(false);
    }
  }

  async function removeEntry(type: "viewed" | "search", id: string) {
    const userId = getCustomerUserId();

    if (!userId) return;

    try {
      await fetch(`/api/history?type=${type}&id=${id}`, {
        method: "DELETE",
        headers: { "x-user-id": userId },
      });

      if (type === "viewed") {
        setViewed((prev) => prev.filter((item) => item._id !== id));
      } else {
        setSearchItems((prev) =>
          prev.filter((item) => item._id !== id)
        );
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function clearTab(type: "viewed" | "search") {
    const userId = getCustomerUserId();

    if (!userId) return;

    try {
      await fetch(`/api/history?type=${type}`, {
        method: "DELETE",
        headers: { "x-user-id": userId },
      });

      if (type === "viewed") {
        setViewed([]);
      } else {
        setSearchItems([]);
      }
    } catch (err) {
      console.error(err);
    }
  }

  function searchAgain(query: string) {
    sessionStorage.setItem("techstar_pending_category", query);
    router.push("/");
  }

  function formatDate(date?: string) {
    if (!date) return "";

    return new Date(date).toLocaleString(
      language === "bn" ? "bn-BD" : "en-BD",
      {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      }
    );
  }

  function statusLabel(status?: string) {
    return t(`orders.status.${status || "pending"}`);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-20 text-white">
        <div className="mx-auto max-w-xl text-center">
          <div className="text-5xl">🕘</div>
          <h1 className="mt-5 text-2xl font-bold">
            {t("common.loading")}
          </h1>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="text-sm font-medium text-slate-400 hover:text-white"
        >
          {`← ${t("settings.continueShopping")}`}
        </Link>

        <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
          {t("history.title")}
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          {t("history.subtitle")}
        </p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-sm font-bold text-white">
            {t("history.retentionLabel")}
          </div>

          <div className="mt-3 flex gap-2">
            {[1, 7, 30].map((days) => (
              <button
                key={days}
                onClick={() => updateRetention(days)}
                disabled={savingRetention}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                  retentionDays === days
                    ? "bg-blue-600 text-white"
                    : "border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08]"
                }`}
              >
                {days === 1
                  ? t("history.retention1Day")
                  : days === 7
                  ? t("history.retention7Days")
                  : t("history.retention30Days")}
              </button>
            ))}
          </div>

          <p className="mt-3 text-xs text-slate-500">
            {t("history.retentionHint")}
          </p>
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            ⚠️ {error}
          </div>
        )}

        <div className="mt-6 flex gap-2 border-b border-white/10">
          {(["viewed", "search", "orders"] as const).map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`border-b-2 px-4 py-3 text-sm font-bold transition ${
                tab === key
                  ? "border-blue-500 text-white"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              {key === "viewed"
                ? t("history.tabViewed")
                : key === "search"
                ? t("history.tabSearch")
                : t("history.tabOrders")}
            </button>
          ))}
        </div>

        {tab === "viewed" && (
          <div className="mt-6">
            {viewed.length > 0 && (
              <div className="mb-4 flex justify-end">
                <button
                  onClick={() => clearTab("viewed")}
                  className="text-xs font-semibold text-red-400 hover:text-red-300"
                >
                  {t("cart.clear")}
                </button>
              </div>
            )}

            {viewed.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-16 text-center">
                <div className="text-4xl">👁️</div>
                <h2 className="mt-4 text-lg font-bold">
                  {t("history.noViewed")}
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  {t("history.noViewedHint")}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {viewed.map((item) =>
                  item.product ? (
                    <div
                      key={item._id}
                      className="overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-900/70"
                    >
                      <Link
                        href={`/products/${item.product.slug}`}
                        className="block"
                      >
                        <div className="relative h-36 bg-slate-950">
                          {item.product.image ? (
                            <img
                              src={item.product.image}
                              alt={item.product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-4xl">
                              ⚡
                            </div>
                          )}
                        </div>
                      </Link>

                      <div className="p-3">
                        <h3 className="line-clamp-2 min-h-[36px] text-xs font-bold text-white">
                          {item.product.name}
                        </h3>

                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-sm font-extrabold">
                            {format(item.product.price)}
                          </span>

                          <button
                            onClick={() =>
                              removeEntry("viewed", item._id)
                            }
                            className="text-[11px] font-semibold text-red-400 hover:text-red-300"
                          >
                            {t("history.remove")}
                          </button>
                        </div>

                        <div className="mt-1 text-[10px] text-slate-500">
                          {t("history.viewedAt")} {formatDate(item.at)}
                        </div>
                      </div>
                    </div>
                  ) : null
                )}
              </div>
            )}
          </div>
        )}

        {tab === "search" && (
          <div className="mt-6">
            {searchItems.length > 0 && (
              <div className="mb-4 flex justify-end">
                <button
                  onClick={() => clearTab("search")}
                  className="text-xs font-semibold text-red-400 hover:text-red-300"
                >
                  {t("cart.clear")}
                </button>
              </div>
            )}

            {searchItems.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-16 text-center">
                <div className="text-4xl">🔎</div>
                <h2 className="mt-4 text-lg font-bold">
                  {t("history.noSearch")}
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  {t("history.noSearchHint")}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                {searchItems.map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between gap-3 px-5 py-4"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-white">
                        {item.query}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        {t("history.searchedAt")} {formatDate(item.at)}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <button
                        onClick={() => searchAgain(item.query)}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-500"
                      >
                        {t("history.searchAgain")}
                      </button>
                      <button
                        onClick={() =>
                          removeEntry("search", item._id)
                        }
                        className="text-xs font-semibold text-red-400 hover:text-red-300"
                      >
                        {t("history.remove")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "orders" && (
          <div className="mt-6">
            {orders.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-16 text-center">
                <div className="text-4xl">📦</div>
                <h2 className="mt-4 text-lg font-bold">
                  {t("orders.noOrdersYet")}
                </h2>
              </div>
            ) : (
              <div className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                {orders.map((order) => (
                  <Link
                    key={order._id}
                    href="/orders"
                    className="flex items-center justify-between gap-3 px-5 py-4 transition hover:bg-white/[0.05]"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-white">
                        #{order._id}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        {formatDate(order.createdAt)}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-bold capitalize">
                        {statusLabel(order.status)}
                      </span>
                      <span className="text-sm font-extrabold">
                        {format(order.totalAmount)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <div className="mt-4 text-center">
              <Link
                href="/orders"
                className="text-xs font-semibold text-blue-300 hover:text-blue-200"
              >
                {`${t("common.viewAll")} →`}
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
