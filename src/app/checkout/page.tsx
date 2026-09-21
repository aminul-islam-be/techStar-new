"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getCustomerUser } from "@/lib/customerAuth";
import { useCurrency } from "@/lib/useCurrency";
import { useLanguage } from "@/lib/language";
import { useRouter } from "next/navigation";

type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
};

type CartData = { items: CartItem[] };

type FormData = {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  area: string;
};

export default function CheckoutPage() {
  const { format } = useCurrency();
  const { t } = useLanguage();
  const router = useRouter();

  const [cart, setCart] = useState<CartData>({ items: [] });
  const [form, setForm] = useState<FormData>({
    fullName: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    area: "",
  });

  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const user = getCustomerUser();
    if (user) {
      setForm((current) => ({
        ...current,
        fullName: user.fullName || "",
        phone: user.phone || "",
        email: user.email || "",
      }));
      loadCart(user.id);
    } else {
      loadCart(""); 
    }
  }, []);

  async function loadCart(userId: string) {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/cart", {
        headers: { "x-user-id": userId },
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || t("cart.unableToLoad"));
      }

      const loadedCart = data.cart || { items: [] };
      setCart(loadedCart);

      if (!loadedCart.items?.length) {
        setError(t("checkout.cartEmptyError"));
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : t("cart.unableToLoad"));
    } finally {
      setLoading(false);
    }
  }

  const totalItems = useMemo(() => cart.items.reduce((total, item) => total + item.quantity, 0), [cart.items]);
  const subtotal = useMemo(() => cart.items.reduce((total, item) => total + item.price * item.quantity, 0), [cart.items]);

  function updateField(field: keyof FormData, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!cart.items.length) {
      setError(t("checkout.cartEmptyError"));
      return;
    }

    if (!form.fullName.trim() || !form.phone.trim() || !form.address.trim()) {
      setError(t("checkout.requiredFieldsError"));
      return;
    }

    try {
      setPlacing(true);
      setError("");
      setMessage("");

      const user = getCustomerUser();
      const userId = user ? user.id : "";

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({
          userId: userId,
          customerName: form.fullName.trim(),
          customerPhone: form.phone.trim(),
          customerEmail: form.email.trim(),
          items: cart.items,
          totalAmount: subtotal,
          deliveryAddress: {
            fullName: form.fullName.trim(),
            phone: form.phone.trim(),
            address: form.address.trim(),
            city: form.city.trim(),
            area: form.area.trim(),
          },
          paymentMethod: "sslcommerz",
        }),
      });

      const data = await response.json();

      if (data.redirectToLogin) {
        router.push("/login?redirect=/checkout");
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || t("checkout.unableToPlaceOrder"));
      }

      setMessage(data.message || t("checkout.orderPlacedSuccess"));
      setCart({ items: [] });

      setTimeout(() => {
        router.push(`/payment/${data.orderId}`);
      }, 500);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : t("checkout.unableToPlaceOrder"));
    } finally {
      setPlacing(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-20 text-white">
        <div className="mx-auto max-w-xl text-center">
          <div className="text-5xl">🛒</div>
          <h1 className="mt-5 text-2xl font-bold">{t("checkout.preparingCheckout")}</h1>
          <p className="mt-2 text-sm text-slate-400">{t("checkout.pleaseWait")}</p>
        </div>
      </main>
    );
  }

  if (error === t("checkout.cartEmptyError")) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-12 text-white">
        <div className="mx-auto max-w-xl text-center">
          <div className="text-6xl">🛒</div>
          <h1 className="mt-5 text-3xl font-extrabold">{t("cart.empty")}</h1>
          <p className="mt-3 text-slate-400">{t("checkout.emptyCartHint")}</p>
          <Link href="/#products" className="mt-7 inline-flex rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-500">
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
          <Link href="/cart" className="text-sm font-medium text-slate-400 hover:text-white">
            {`← ${t("checkout.backToCart")}`}
          </Link>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">{t("checkout.title")}</h1>
          <p className="mt-2 text-sm text-slate-400">{t("checkout.subtitle")}</p>
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

        <form onSubmit={placeOrder} className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="rounded-3xl border border-white/[0.08] bg-slate-900/70 p-5 sm:p-7">
            <div className="mb-7">
              <h2 className="text-xl font-bold">{t("checkout.deliveryInfo")}</h2>
              <p className="mt-1 text-xs text-slate-500">{t("checkout.deliveryInfoHint")}</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold">{t("checkout.fullNameLabel")}</label>
                <input value={form.fullName} onChange={(e) => updateField("fullName", e.target.value)} placeholder={t("checkout.fullNamePlaceholder")} className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-blue-500" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold">{t("checkout.phoneLabel")}</label>
                <input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder={t("checkout.phonePlaceholder")} className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-blue-500" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-semibold">{t("checkout.emailLabel")}</label>
                <input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} placeholder={t("checkout.emailPlaceholder")} className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-blue-500" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-semibold">{t("checkout.addressLabel")}</label>
                <textarea value={form.address} onChange={(e) => updateField("address", e.target.value)} placeholder={t("checkout.addressPlaceholder")} rows={4} className="w-full resize-none rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-blue-500" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold">{t("checkout.areaLabel")}</label>
                <input value={form.area} onChange={(e) => updateField("area", e.target.value)} placeholder={t("checkout.areaPlaceholder")} className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-blue-500" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold">{t("checkout.cityLabel")}</label>
                <input value={form.city} onChange={(e) => updateField("city", e.target.value)} placeholder={t("checkout.cityPlaceholder")} className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-blue-500" />
              </div>
            </div>
          </section>

          <aside className="h-fit rounded-3xl border border-white/[0.08] bg-slate-900/70 p-5 lg:sticky lg:top-6">
            <h2 className="text-lg font-bold">{t("cart.orderSummary")}</h2>
            
            <div className="mt-5 space-y-4">
              {cart.items.map((item) => (
                <div key={item.productId} className="flex gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-950">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="h-full w-full object-contain" />
                    ) : (
                      <span>⚡</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold">{item.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.quantity} × {format(item.price)}</p>
                  </div>
                  <div className="text-sm font-bold">{format(item.price * item.quantity)}</div>
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
              <div className="flex justify-between border-t border-white/[0.08] pt-4 font-bold text-white">
                <span>{t("checkout.total")}</span>
                <span className="text-lg text-emerald-400">{format(subtotal)}</span>
              </div>
            </div>

            <button type="submit" disabled={placing || !cart.items.length} className="mt-6 w-full rounded-2xl bg-orange-600 py-4 text-sm font-bold text-white shadow-lg shadow-orange-600/20 transition hover:bg-orange-500 hover:shadow-orange-500/30 disabled:cursor-not-allowed disabled:opacity-50">
              {placing ? t("checkout.processing") : "Proceed to Payment"}
            </button>
          </aside>
        </form>
      </div>
    </main>
  );
}
