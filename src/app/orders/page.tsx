"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCustomerUser } from "@/lib/customerAuth";

type OrderItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
};

type DeliveryAddress = {
  fullName?: string;
  phone?: string;
  address?: string;
  city?: string;
  area?: string;
};

type Order = {
  _id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  items: OrderItem[];
  totalAmount: number;
  currency?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  status?: string;
  deliveryAddress?: DeliveryAddress;
  createdAt?: string;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    const user = getCustomerUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/orders", {
        method: "GET",
        headers: {
          "x-user-id": user.id,
        },
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to load orders."
        );
      }

      setOrders(data.orders || []);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load orders."
      );
    } finally {
      setLoading(false);
    }
  }

  function formatDate(date?: string) {
    if (!date) return "";

    return new Date(date).toLocaleString("en-BD", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function statusClass(status?: string) {
    switch (status) {
      case "delivered":
        return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";

      case "cancelled":
        return "border-red-500/20 bg-red-500/10 text-red-300";

      case "processing":
        return "border-blue-500/20 bg-blue-500/10 text-blue-300";

      case "shipped":
        return "border-purple-500/20 bg-purple-500/10 text-purple-300";

      default:
        return "border-amber-500/20 bg-amber-500/10 text-amber-300";
    }
  }

  function paymentClass(status?: string) {
    switch (status) {
      case "paid":
        return "text-emerald-300";

      case "failed":
        return "text-red-300";

      default:
        return "text-amber-300";
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-20 text-white">
        <div className="mx-auto max-w-xl text-center">
          <div className="text-5xl">📦</div>

          <h1 className="mt-5 text-2xl font-bold">
            Loading your orders...
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Please wait.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/"
              className="text-sm font-medium text-slate-400 hover:text-white"
            >
              ← Continue Shopping
            </Link>

            <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              My Orders
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              View and track your TechStar orders.
            </p>
          </div>

          <Link
            href="/cart"
            className="inline-flex w-fit rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-slate-300 hover:bg-white/[0.08] hover:text-white"
          >
            🛒 My Cart
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300">
            ⚠️ {error}
          </div>
        )}

        {orders.length === 0 ? (
          <div className="rounded-3xl border border-white/[0.08] bg-slate-900/70 px-6 py-16 text-center">
            <div className="text-6xl">📦</div>

            <h2 className="mt-5 text-2xl font-extrabold">
              No orders yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              You have not placed any orders yet. Browse our electrical
              and electronics products and place your first order.
            </p>

            <Link
              href="/#products"
              className="mt-7 inline-flex rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-500"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <section
                key={order._id}
                className="overflow-hidden rounded-3xl border border-white/[0.08] bg-slate-900/70"
              >
                <div className="border-b border-white/[0.08] px-5 py-5 sm:px-7">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Order ID
                      </p>

                      <p className="mt-1 break-all text-sm font-bold text-white">
                        #{order._id}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full border px-3 py-1.5 text-xs font-bold capitalize ${statusClass(
                          order.status
                        )}`}
                      >
                        {order.status || "pending"}
                      </span>

                      <span
                        className={`rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-bold capitalize ${paymentClass(
                          order.paymentStatus
                        )}`}
                      >
                        Payment: {order.paymentStatus || "pending"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-0 lg:grid-cols-[1fr_320px]">

                  <div className="divide-y divide-white/[0.06]">
                    {order.items?.map((item, index) => (
                      <div
                        key={`${order._id}-${item.productId}-${index}`}
                        className="flex gap-4 px-5 py-5 sm:px-7"
                      >
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-950">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-2xl">
                              ⚡
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="line-clamp-2 text-sm font-bold">
                            {item.name}
                          </h3>

                          <p className="mt-1 text-xs text-slate-500">
                            Quantity: {item.quantity}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Unit price: ৳
                            {Number(
                              item.price
                            ).toLocaleString()}
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-sm font-extrabold">
                            ৳
                            {(
                              Number(item.price) *
                              Number(item.quantity)
                            ).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <aside className="border-t border-white/[0.08] bg-slate-950/30 px-5 py-5 lg:border-l lg:border-t-0 sm:px-7">

                    <h3 className="text-sm font-bold">
                      Delivery Information
                    </h3>

                    <div className="mt-4 space-y-1 text-sm">
                      <p className="font-semibold">
                        {order.deliveryAddress?.fullName ||
                          order.customerName}
                      </p>

                      <p className="text-slate-400">
                        {order.deliveryAddress?.phone ||
                          order.customerPhone}
                      </p>

                      {order.deliveryAddress?.address && (
                        <p className="pt-2 leading-6 text-slate-400">
                          {order.deliveryAddress.address}
                          {order.deliveryAddress.area
                            ? `, ${order.deliveryAddress.area}`
                            : ""}
                          {order.deliveryAddress.city
                            ? `, ${order.deliveryAddress.city}`
                            : ""}
                        </p>
                      )}
                    </div>

                    <div className="mt-6 border-t border-white/[0.08] pt-5">
                      <div className="flex justify-between text-sm text-slate-400">
                        <span>Payment</span>
                        <span className="capitalize">
                          {order.paymentMethod || "manual"}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <span className="font-bold">
                          Total
                        </span>

                        <span className="text-xl font-extrabold">
                          ৳
                          {Number(
                            order.totalAmount
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </aside>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
