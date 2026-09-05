"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getCustomerUser } from "@/lib/customerAuth";
import { useCurrency } from "@/lib/useCurrency";
import { useLanguage } from "@/lib/language";

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
  const { format } = useCurrency();
  const { t } = useLanguage();

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
    paymentMethod: "cod",
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
          data.message || t("cart.unableToLoad")
        );
      }

      const loadedCart = data.cart || {
        items: [],
      };

      setCart(loadedCart);

      if (!loadedCart.items?.length) {
        setError(t("checkout.cartEmptyError"));
      }
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : t("cart.unableToLoad")
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
      setError(t("checkout.cartEmptyError"));
      return;
    }

    if (
      !form.fullName.trim() ||
      !form.phone.trim() ||
      !form.address.trim()
    ) {
      setError(t("checkout.requiredFieldsError"));
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
          data.message || t("checkout.unableToPlaceOrder")
        );
      }

      setMessage(
        data.message || t("checkout.orderPlacedSuccess")
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
          : t("checkout.unableToPlaceOrder")
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
            {t("checkout.preparingCheckout")}
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {t("checkout.pleaseWait")}
          </p>
        </div>
      </main>
    );
  }

  if (error === t("checkout.cartEmptyError")) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-12 text-white">
        <div className="mx-auto max-w-xl text-center">
          <div className="text-6xl">🛒</div>

          <h1 className="mt-5 text-3xl font-extrabold">
            {t("cart.empty")}
          </h1>

          <p className="mt-3 text-slate-400">
            {t("checkout.emptyCartHint")}
          </p>

          <Link
            href="/#products"
            className="mt-7 inline-flex rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-500"
          >
            {t("cart.browseProducts")}
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
            {`← ${t("checkout.backToCart")}`}
          </Link>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
            {t("checkout.title")}
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            {t("checkout.subtitle")}
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
                {t("checkout.deliveryInfo")}
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {t("checkout.deliveryInfoHint")}
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  {t("checkout.fullNameLabel")}
                </label>

                <input
                  value={form.fullName}
                  onChange={(e) =>
                    updateField("fullName", e.target.value)
                  }
                  placeholder={t("checkout.fullNamePlaceholder")}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  {t("checkout.phoneLabel")}
                </label>

                <input
                  value={form.phone}
                  onChange={(e) =>
                    updateField("phone", e.target.value)
                  }
                  placeholder={t("checkout.phonePlaceholder")}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-semibold">
                  {t("checkout.emailLabel")}
                </label>

                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    updateField("email", e.target.value)
                  }
                  placeholder={t("checkout.emailPlaceholder")}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-semibold">
                  {t("checkout.addressLabel")}
                </label>

                <textarea
                  value={form.address}
                  onChange={(e) =>
                    updateField("address", e.target.value)
                  }
                  placeholder={t("checkout.addressPlaceholder")}
                  rows={4}
                  className="w-full resize-none rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  {t("checkout.areaLabel")}
                </label>

                <input
                  value={form.area}
                  onChange={(e) =>
                    updateField("area", e.target.value)
                  }
                  placeholder={t("checkout.areaPlaceholder")}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  {t("checkout.cityLabel")}
                </label>

                <input
                  value={form.city}
                  onChange={(e) =>
                    updateField("city", e.target.value)
                  }
                  placeholder={t("checkout.cityPlaceholder")}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-8 border-t border-white/[0.08] pt-7">
              <h2 className="text-xl font-bold">
                {t("checkout.paymentMethod")}
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {t("checkout.paymentMethodHint")}
              </p>

              <div className="mt-4 space-y-3">

                <label
                  className={`block cursor-pointer rounded-2xl border p-4 transition ${
                    form.paymentMethod === "bkash"
                      ? "border-pink-500/50 bg-pink-500/[0.08]"
                      : "border-white/[0.08] bg-slate-950 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={form.paymentMethod === "bkash"}
                      onChange={() =>
                        updateField("paymentMethod", "bkash")
                      }
                    />

                    <span className="font-bold">
                      {t("checkout.bkash")}
                    </span>
                  </div>

                  {form.paymentMethod === "bkash" && (
                    <div className="mt-3 rounded-xl bg-slate-950 px-4 py-3">
                      <p className="text-xs text-slate-500">
                        {t("checkout.sendPaymentTo")}
                      </p>
                      <p className="mt-1 text-lg font-extrabold tracking-wide text-pink-300">
                        01922964696
                      </p>
                    </div>
                  )}
                </label>

                <label
                  className={`block cursor-pointer rounded-2xl border p-4 transition ${
                    form.paymentMethod === "nagad"
                      ? "border-orange-500/50 bg-orange-500/[0.08]"
                      : "border-white/[0.08] bg-slate-950 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={form.paymentMethod === "nagad"}
                      onChange={() =>
                        updateField("paymentMethod", "nagad")
                      }
                    />

                    <span className="font-bold">
                      {t("checkout.nagad")}
                    </span>
                  </div>

                  {form.paymentMethod === "nagad" && (
                    <div className="mt-3 rounded-xl bg-slate-950 px-4 py-3">
                      <p className="text-xs text-slate-500">
                        {t("checkout.sendPaymentTo")}
                      </p>
                      <p className="mt-1 text-lg font-extrabold tracking-wide text-orange-300">
                        01922964696
                      </p>
                    </div>
                  )}
                </label>

                <label
                  className={`block cursor-pointer rounded-2xl border p-4 transition ${
                    form.paymentMethod === "rocket"
                      ? "border-purple-500/50 bg-purple-500/[0.08]"
                      : "border-white/[0.08] bg-slate-950 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={form.paymentMethod === "rocket"}
                      onChange={() =>
                        updateField("paymentMethod", "rocket")
                      }
                    />

                    <span className="font-bold">
                      {t("checkout.rocket")}
                    </span>
                  </div>

                  {form.paymentMethod === "rocket" && (
                    <div className="mt-3 rounded-xl bg-slate-950 px-4 py-3">
                      <p className="text-xs text-slate-500">
                        {t("checkout.sendPaymentTo")}
                      </p>
                      <p className="mt-1 text-lg font-extrabold tracking-wide text-purple-300">
                        01922964696
                      </p>
                    </div>
                  )}
                </label>

                <label
                  className={`block cursor-pointer rounded-2xl border p-4 transition ${
                    form.paymentMethod === "cod"
                      ? "border-emerald-500/50 bg-emerald-500/[0.08]"
                      : "border-white/[0.08] bg-slate-950 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={form.paymentMethod === "cod"}
                      onChange={() =>
                        updateField("paymentMethod", "cod")
                      }
                    />

                    <span className="font-bold">
                      {t("checkout.cashOnDelivery")}
                    </span>
                  </div>

                  {form.paymentMethod === "cod" && (
                    <div className="mt-3 rounded-xl bg-slate-950 px-4 py-3 text-xs leading-5 text-slate-400">
                      {t("checkout.codDescription")}
                    </div>
                  )}
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setMessage(t("checkout.sslcommerzOffMessage"));
                  }}
                  className="w-full rounded-2xl border border-white/[0.08] bg-slate-950 p-4 text-left transition hover:border-white/20"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">
                      {t("checkout.sslcommerz")}
                    </span>

                    <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-300">
                      {t("checkout.sslcommerzOff")}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    {t("checkout.sslcommerzHint")}
                  </p>
                </button>

              </div>
            </div>
          </section>

          <aside className="h-fit rounded-3xl border border-white/[0.08] bg-slate-900/70 p-5 lg:sticky lg:top-6">

            <h2 className="text-lg font-bold">
              {t("cart.orderSummary")}
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
                      {item.quantity} × {format(item.price)}
                    </p>
                  </div>

                  <div className="text-sm font-bold">
                    {format(item.price * item.quantity)}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-3 border-t border-white/[0.08] pt-5 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>{t("cart.items")}</span>
                <span>{totalItems}</span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>{t("cart.subtotal")}</span>
                <span>{format(subtotal)}</span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>{t("cart.delivery")}</span>
                <span>{t("checkout.deliveryCalculatedLater")}</span>
              </div>

              <div className="flex justify-between border-t border-white/[0.08] pt-4">
                <span className="font-bold">
                  {t("cart.total")}
                </span>

                <span className="text-xl font-extrabold">
                  {format(subtotal)}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={placing}
              className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-4 text-sm font-extrabold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {placing
                ? t("checkout.placingOrder")
                : t("checkout.placeOrder")}
            </button>

            <p className="mt-3 text-center text-[11px] leading-5 text-slate-600">
              {t("checkout.confirmNote")}
            </p>
          </aside>
        </form>
      </div>
    </main>
  );
}
