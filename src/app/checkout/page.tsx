"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getCustomerUser } from "@/lib/customerAuth";

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

type FormData = {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  area: string;
  paymentMethod: string;
};

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartData>({
    items: [],
  });

  const [form, setForm] = useState<FormData>({
    fullName: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    area: "",
    paymentMethod: "manual",
  });

  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const user = getCustomerUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    setForm((current) => ({
      ...current,
      fullName: user.fullName || "",
      phone: user.phone || "",
      email: user.email || "",
    }));

    loadCart(user.id);
  }, []);

  async function loadCart(userId: string) {
    try {
      setLoading(true);
      setError("");

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

      const loadedCart = data.cart || {
        items: [],
      };

      setCart(loadedCart);

      if (!loadedCart.items?.length) {
        setError("Your cart is empty.");
      }
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

  function updateField(
    field: keyof FormData,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function placeOrder(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const user = getCustomerUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    if (!cart.items.length) {
      setError("Your cart is empty.");
      return;
    }

    if (
      !form.fullName.trim() ||
      !form.phone.trim() ||
      !form.address.trim()
    ) {
      setError(
        "Full name, phone number and delivery address are required."
      );
      return;
    }

    try {
      setPlacing(true);
      setError("");
      setMessage("");

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
        },
        body: JSON.stringify({
          customerName: form.fullName.trim(),
          customerPhone: form.phone.trim(),
          customerEmail: form.email.trim(),
          deliveryAddress: {
            fullName: form.fullName.trim(),
            phone: form.phone.trim(),
            address: form.address.trim(),
            city: form.city.trim(),
            area: form.area.trim(),
          },
          paymentMethod: form.paymentMethod,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to place order."
        );
      }

      setMessage(
        data.message || "Order placed successfully."
      );

      setCart({
        items: [],
      });

      setTimeout(() => {
        window.location.href = "/orders";
      }, 900);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to place order."
      );
    } finally {
      setPlacing(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-20 text-white">
        <div className="mx-auto max-w-xl text-center">
          <div className="text-5xl">🛒</div>
          <h1 className="mt-5 text-2xl font-bold">
            Preparing checkout...
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Please wait.
          </p>
        </div>
      </main>
    );
  }

  if (error === "Your cart is empty.") {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-12 text-white">
        <div className="mx-auto max-w-xl text-center">
          <div className="text-6xl">🛒</div>

          <h1 className="mt-5 text-3xl font-extrabold">
            Your cart is empty
          </h1>

          <p className="mt-3 text-slate-400">
            Add some products before continuing to checkout.
          </p>

          <Link
            href="/#products"
            className="mt-7 inline-flex rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-500"
          >
            Browse Products
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">

        <div className="mb-8">
          <Link
            href="/cart"
            className="text-sm font-medium text-slate-400 hover:text-white"
          >
            ← Back to Cart
          </Link>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Checkout
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Complete your delivery information and place your order.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            ⚠️ {error}
          </div>
        )}

        {message && (
          <div className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            ✓ {message}
          </div>
        )}

        <form
          onSubmit={placeOrder}
          className="grid gap-6 lg:grid-cols-[1fr_360px]"
        >
          <section className="rounded-3xl border border-white/[0.08] bg-slate-900/70 p-5 sm:p-7">

            <div className="mb-7">
              <h2 className="text-xl font-bold">
                Delivery Information
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Your login information has been filled automatically.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Full Name *
                </label>

                <input
                  value={form.fullName}
                  onChange={(e) =>
                    updateField("fullName", e.target.value)
                  }
                  placeholder="Your full name"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Phone Number *
                </label>

                <input
                  value={form.phone}
                  onChange={(e) =>
                    updateField("phone", e.target.value)
                  }
                  placeholder="017XXXXXXXX"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-semibold">
                  Email Address
                </label>

                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    updateField("email", e.target.value)
                  }
                  placeholder="example@email.com"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-semibold">
                  Delivery Address *
                </label>

                <textarea
                  value={form.address}
                  onChange={(e) =>
                    updateField("address", e.target.value)
                  }
                  placeholder="House/Road/Block and full delivery address"
                  rows={4}
                  className="w-full resize-none rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Area
                </label>

                <input
                  value={form.area}
                  onChange={(e) =>
                    updateField("area", e.target.value)
                  }
                  placeholder="Area / Thana"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  City
                </label>

                <input
                  value={form.city}
                  onChange={(e) =>
                    updateField("city", e.target.value)
                  }
                  placeholder="City"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-8 border-t border-white/[0.08] pt-7">
              <h2 className="text-xl font-bold">
                Payment Method
              </h2>

              <div className="mt-4 rounded-2xl border border-blue-500/30 bg-blue-500/[0.06] p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="radio"
                    checked={form.paymentMethod === "manual"}
                    onChange={() =>
                      updateField(
                        "paymentMethod",
                        "manual"
                      )
                    }
                    className="mt-1"
                  />

                  <span>
                    <span className="block font-bold">
                      Manual Payment
                    </span>

                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      Payment instructions will be provided by TechStar
                      after your order is submitted.
                    </span>
                  </span>
                </label>
              </div>
            </div>
          </section>

          <aside className="h-fit rounded-3xl border border-white/[0.08] bg-slate-900/70 p-5 lg:sticky lg:top-6">

            <h2 className="text-lg font-bold">
              Order Summary
            </h2>

            <div className="mt-5 space-y-4">
              {cart.items.map((item) => (
                <div
                  key={item.productId}
                  className="flex gap-3"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-950">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span>⚡</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold">
                      {item.name}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {item.quantity} × ৳
                      {item.price.toLocaleString()}
                    </p>
                  </div>

                  <div className="text-sm font-bold">
                    ৳
                    {(
                      item.price * item.quantity
                    ).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-3 border-t border-white/[0.08] pt-5 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Items</span>
                <span>{totalItems}</span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span>৳{subtotal.toLocaleString()}</span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>Delivery</span>
                <span>Calculated later</span>
              </div>

              <div className="flex justify-between border-t border-white/[0.08] pt-4">
                <span className="font-bold">
                  Total
                </span>

                <span className="text-xl font-extrabold">
                  ৳{subtotal.toLocaleString()}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={placing}
              className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-4 text-sm font-extrabold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {placing
                ? "Placing Order..."
                : "Place Order"}
            </button>

            <p className="mt-3 text-center text-[11px] leading-5 text-slate-600">
              By placing this order, you confirm that the delivery
              information is correct.
            </p>
          </aside>
        </form>
      </div>
    </main>
  );
}
