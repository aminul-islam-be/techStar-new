"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getCustomerUserId,
} from "@/lib/customerAuth";

type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
};

type CartData = {
  items: CartItem[];
};

export default function CartPage() {
  const [cart, setCart] = useState<CartData>({
    items: [],
  });

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState("");
  const [error, setError] = useState("");

  async function loadCart() {
    try {
      setLoading(true);
      setError("");

      const userId = getCustomerUserId();

      if (!userId) {
        setError("Please login to view your cart.");
        return;
      }

      const response = await fetch("/api/cart", {
        headers: {
          "x-user-id": userId,
        },
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to load cart."
        );
      }

      setCart(data.cart || { items: [] });
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load cart."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCart();
  }, []);
  const totalItems = useMemo(() => {
    return cart.items.reduce(
      (total, item) => total + item.quantity,
      0
    );
  }, [cart.items]);

  const subtotal = useMemo(() => {
    return cart.items.reduce(
      (total, item) =>
        total + item.price * item.quantity,
      0
    );
  }, [cart.items]);

  async function updateQuantity(
    productId: string,
    quantity: number
  ) {
    if (quantity < 1) return;

    try {
      setUpdating(productId);
      setError("");

      const userId = getCustomerUserId();

      const response = await fetch("/api/cart", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({
          productId,
          quantity,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to update cart."
        );
      }

      setCart(data.cart || { items: [] });
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to update cart."
      );
    } finally {
      setUpdating("");
    }
  }

  async function removeItem(productId: string) {
    try {
      setUpdating(productId);
      setError("");

      const userId = getCustomerUserId();

      const response = await fetch(
        `/api/cart?productId=${encodeURIComponent(
          productId
        )}`,
        {
          method: "DELETE",
          headers: {
            "x-user-id": userId,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to remove product."
        );
      }

      setCart(data.cart || { items: [] });
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to remove product."
      );
    } finally {
      setUpdating("");
    }
  }
  async function clearCart() {
    try {
      setUpdating("clear");
      setError("");

      const userId = getCustomerUserId();

      const response = await fetch("/api/cart", {
        method: "DELETE",
        headers: {
          "x-user-id": userId,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to clear cart."
        );
      }

      setCart({ items: [] });
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to clear cart."
      );
    } finally {
      setUpdating("");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-20 text-white">
        <div className="mx-auto max-w-5xl text-center">
          <div className="text-4xl">🛒</div>

          <h1 className="mt-4 text-2xl font-bold">
            Loading your cart...
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Please wait a moment.
          </p>
        </div>
      </main>
    );
  }

  if (error && !cart.items.length) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-20 text-white">
        <div className="mx-auto max-w-md text-center">
          <div className="text-5xl">🔐</div>

          <h1 className="mt-5 text-2xl font-bold">
            Login Required
          </h1>

          <p className="mt-3 text-slate-400">
            {error}
          </p>

          <Link
            href="/login"
            className="mt-7 inline-flex rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-500"
          >
            Sign In
          </Link>
        </div>
      </main>
    );
  }
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/"
              className="text-sm font-medium text-slate-400 transition hover:text-white"
            >
              ← Continue Shopping
            </Link>

            <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Shopping Cart
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              {totalItems}{" "}
              {totalItems === 1 ? "item" : "items"} in
              your cart
            </p>
          </div>

          {cart.items.length > 0 && (
            <button
              onClick={clearCart}
              disabled={updating === "clear"}
              className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
            >
              {updating === "clear"
                ? "Clearing..."
                : "Clear Cart"}
            </button>
          )}
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            ⚠️ {error}
          </div>
        )}

        {cart.items.length === 0 ? (
          <div className="rounded-3xl border border-white/[0.08] bg-slate-900/70 px-6 py-16 text-center">
            <div className="text-6xl">🛒</div>

            <h2 className="mt-5 text-2xl font-bold">
              Your cart is empty
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
              Browse our electrical and electronics
              products and add something to your cart.
            </p>

            <Link
              href="/#products"
              className="mt-7 inline-flex rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-500"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
            <section className="space-y-3">
              {cart.items.map((item) => (
                <div
                  key={item.productId}
                  className="rounded-2xl border border-white/[0.08] bg-slate-900/70 p-4 sm:p-5"
                >
                  <div className="flex gap-4">

                    <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/[0.08] bg-slate-950 sm:h-28 sm:w-28">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-3xl">
                          ⚡
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="line-clamp-2 text-base font-bold text-white sm:text-lg">
                        {item.name}
                      </h2>

                      <p className="mt-2 text-sm text-slate-400">
                        ৳{item.price.toLocaleString()}
                        {" "}each
                      </p>

                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <div className="flex items-center overflow-hidden rounded-xl border border-white/10 bg-slate-950">
                          <button
                            onClick={() =>
                              updateQuantity(
                                item.productId,
                                item.quantity - 1
                              )
                            }
                            disabled={
                              updating === item.productId ||
                              item.quantity <= 1
                            }
                            className="h-9 w-9 text-lg font-bold text-slate-300 transition hover:bg-white/10 disabled:opacity-30"
                          >
                            −
                          </button>

                          <span className="flex h-9 min-w-10 items-center justify-center border-x border-white/10 px-2 text-sm font-bold">
                            {item.quantity}
                          </span>

                          <button
                            onClick={() =>
                              updateQuantity(
                                item.productId,
                                item.quantity + 1
                              )
                            }
                            disabled={
                              updating === item.productId
                            }
                            className="h-9 w-9 text-lg font-bold text-slate-300 transition hover:bg-white/10 disabled:opacity-30"
                          >
                            +
                          </button>
                        </div>

                        <button
                          onClick={() =>
                            removeItem(item.productId)
                          }
                          disabled={
                            updating === item.productId
                          }
                          className="text-xs font-semibold text-red-400 transition hover:text-red-300 disabled:opacity-40"
                        >
                          {updating === item.productId
                            ? "Removing..."
                            : "Remove"}
                        </button>
                      </div>
                    </div>

                    <div className="hidden text-right sm:block">
                      <p className="text-lg font-extrabold">
                        ৳
                        {(
                          item.price * item.quantity
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3 sm:hidden">
                    <span className="text-xs text-slate-500">
                      Item total
                    </span>

                    <span className="font-bold">
                      ৳
                      {(
                        item.price * item.quantity
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </section>
            <aside className="h-fit rounded-2xl border border-white/[0.08] bg-slate-900/70 p-5 lg:sticky lg:top-6">
              <h2 className="text-lg font-bold">
                Order Summary
              </h2>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>Items</span>
                  <span>{totalItems}</span>
                </div>

                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span>
                    ৳{subtotal.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between text-slate-400">
                  <span>Delivery</span>
                  <span>Calculated at checkout</span>
                </div>

                <div className="border-t border-white/[0.08] pt-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">
                      Total
                    </span>

                    <span className="text-xl font-extrabold">
                      ৳{subtotal.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <button
                disabled
                className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-extrabold text-white opacity-50"
              >
                Checkout — Coming Next
              </button>

              <p className="mt-3 text-center text-xs leading-5 text-slate-500">
                Checkout will be connected after the
                cart system is fully tested.
              </p>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}

