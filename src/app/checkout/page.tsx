"use client";

import { COURIER_NOTE } from "@/lib/refundPolicy";
import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getCustomerUser } from "@/lib/customerAuth";
import { useCurrency } from "@/lib/useCurrency";
import { useLanguage } from "@/lib/language";
import { useRouter } from "next/navigation";
import { DISTRICTS, DIVISIONS, isDhakaDivision } from "@/lib/bdDistricts";
import AddressForm, { titleIcon, type SavedAddress } from "@/components/AddressForm";

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
  const [paymentMethod, setPaymentMethod] = useState<"sslcommerz" | "cod">("sslcommerz");
  const [rates, setRates] = useState({ insideDhaka: 80, outsideDhaka: 120 });

  // ----- saved addresses (Home / Office / ...) -----
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [saveToBook, setSaveToBook] = useState(true);
  const usingSaved = addresses.length > 0 && selectedAddressId !== "";

  // ----- coupon -----
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponMessage, setCouponMessage] = useState("");
  const [couponChecking, setCouponChecking] = useState(false);

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
      loadAddresses();
    } else {
      loadCart(""); 
    }
  }, []);

  function chooseAddress(a: SavedAddress) {
    setSelectedAddressId(a._id);
    setForm((current) => ({
      ...current,
      fullName: a.name,
      phone: a.phone,
      address: a.address,
      city: a.city,
      area: a.area || "",
    }));
  }

  async function loadAddresses(selectId?: string) {
    try {
      const response = await fetch("/api/addresses", { cache: "no-store" });
      const data = await response.json();

      // not logged in / session expired: the normal manual form is used
      if (!response.ok || !data.success) return;

      const list: SavedAddress[] = data.addresses || [];
      setAddresses(list);

      const pick =
        list.find((a) => a._id === selectId) ||
        list.find((a) => a.isDefault) ||
        list[0];

      if (pick) chooseAddress(pick);
    } catch {
      /* manual form stays available */
    }
  }

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

  useEffect(() => {
    fetch("/api/shipping/rates", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setRates({ insideDhaka: d.insideDhaka, outsideDhaka: d.outsideDhaka });
      })
      .catch(() => {});
  }, []);

  // every product is its own parcel and gets its own courier charge
  const courierPerProduct = form.city ? (isDhakaDivision(form.city) ? rates.insideDhaka : rates.outsideDhaka) : 0;
  const courierTotal = cart.items.length * courierPerProduct;
  const discount = appliedCoupon ? Math.min(appliedCoupon.discount, subtotal) : 0;
  const payable = subtotal + courierTotal - discount;

  async function applyCoupon() {
    const code = couponInput.trim();

    if (!code) {
      setCouponMessage("Please enter a coupon code.");
      return;
    }

    try {
      setCouponChecking(true);
      setCouponMessage("");

      const user = getCustomerUser();
      const response = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": user ? user.id : "" },
        body: JSON.stringify({ code, itemsTotal: subtotal }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setAppliedCoupon(null);
        setCouponMessage(data.message || "This coupon is not valid.");
        return;
      }

      setAppliedCoupon({ code: data.code, discount: data.discount });
      setCouponInput("");
    } catch {
      setCouponMessage("Unable to check the coupon. Please try again.");
    } finally {
      setCouponChecking(false);
    }
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponMessage("");
  }

  function updateField(field: keyof FormData, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!cart.items.length) {
      setError(t("checkout.cartEmptyError"));
      return;
    }

    if (!form.fullName.trim() || !form.phone.trim() || !form.address.trim() || !form.city.trim()) {
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
          totalAmount: payable,
          couponCode: appliedCoupon ? appliedCoupon.code : "",
          deliveryAddress: {
            fullName: form.fullName.trim(),
            phone: form.phone.trim(),
            address: form.address.trim(),
            city: form.city.trim(),
            area: form.area.trim(),
          },
          paymentMethod: paymentMethod,
        }),
      });

      const data = await response.json();

      if (data.redirectToLogin) {
        router.push("/login?redirect=/checkout");
        return;
      }

      if (!response.ok || !data.success) {
        if (data.couponError) {
          setAppliedCoupon(null);
          setCouponMessage(data.message || "This coupon is no longer valid.");
        }
        throw new Error(data.message || t("checkout.unableToPlaceOrder"));
      }

      // typed a new address by hand? keep it in the address book for next time
      if (saveToBook && !usingSaved && userId) {
        fetch("/api/addresses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "Home",
            name: form.fullName.trim(),
            phone: form.phone.trim(),
            city: form.city.trim(),
            area: form.area.trim(),
            address: form.address.trim(),
          }),
        }).catch(() => {});
      }

      setMessage(data.message || t("checkout.orderPlacedSuccess"));
      setCart({ items: [] });

      setTimeout(() => {
        router.push(paymentMethod === "cod" ? "/orders?placed=cod" : `/payment/${data.orderId}`);
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
            {addresses.length > 0 && (
              <div className="mb-6">
                <h3 className="mb-3 text-sm font-bold">Select Delivery Address</h3>
                <div className="space-y-3">
                  {addresses.map((a) => (
                    <label
                      key={a._id}
                      className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                        selectedAddressId === a._id
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-white/10 hover:border-white/25"
                      }`}
                    >
                      <input
                        type="radio"
                        name="deliveryAddress"
                        checked={selectedAddressId === a._id}
                        onChange={() => chooseAddress(a)}
                        className="mt-1 h-4 w-4 accent-blue-500"
                      />
                      <div className="min-w-0 flex-1 text-sm">
                        <div className="flex flex-wrap items-center gap-2 font-bold">
                          <span>{titleIcon(a.title)} {a.title}</span>
                          {a.isDefault && (
                            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold">Default</span>
                          )}
                        </div>
                        <p className="mt-1 text-slate-300">{a.name} · {a.phone}</p>
                        <p className="text-slate-400">
                          {[a.address, a.area, a.city].filter(Boolean).join(", ")}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setShowAddressForm(true)}
                    className="rounded-xl border border-dashed border-blue-500/50 px-4 py-2.5 text-sm font-bold text-blue-300 hover:bg-blue-500/10"
                  >
                    + Add New Address
                  </button>
                  <Link href="/addresses" className="text-xs font-semibold text-slate-400 hover:text-white">
                    Manage addresses
                  </Link>
                </div>
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <div className={usingSaved ? "hidden" : ""}>
                <label className="mb-2 block text-sm font-semibold">{t("checkout.fullNameLabel")}</label>
                <input value={form.fullName} onChange={(e) => updateField("fullName", e.target.value)} placeholder={t("checkout.fullNamePlaceholder")} className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-blue-500" />
              </div>
              <div className={usingSaved ? "hidden" : ""}>
                <label className="mb-2 block text-sm font-semibold">{t("checkout.phoneLabel")}</label>
                <input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder={t("checkout.phonePlaceholder")} className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-blue-500" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-semibold">{t("checkout.emailLabel")}</label>
                <input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} placeholder={t("checkout.emailPlaceholder")} className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-blue-500" />
              </div>
              <div className={`sm:col-span-2 ${usingSaved ? "hidden" : ""}`}>
                <label className="mb-2 block text-sm font-semibold">{t("checkout.addressLabel")}</label>
                <textarea value={form.address} onChange={(e) => updateField("address", e.target.value)} placeholder={t("checkout.addressPlaceholder")} rows={4} className="w-full resize-none rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-blue-500" />
              </div>
              <div className={usingSaved ? "hidden" : ""}>
                <label className="mb-2 block text-sm font-semibold">{t("checkout.areaLabel")}</label>
                <input value={form.area} onChange={(e) => updateField("area", e.target.value)} placeholder={t("checkout.areaPlaceholder")} className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-blue-500" />
              </div>
              <div className={usingSaved ? "hidden" : ""}>
                <label className="mb-2 block text-sm font-semibold">{t("checkout.cityLabel")}</label>
                <select value={form.city} onChange={(e) => updateField("city", e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500">
                  <option value="">Select district</option>
                  {DIVISIONS.map((division) => (
                    <optgroup key={division} label={`${division} Division`}>
                      {DISTRICTS.filter((d) => d.division === division).map((d) => (
                        <option key={d.name} value={d.name}>{d.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>

            {!usingSaved && getCustomerUser() && (
              <label className="mt-5 flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={saveToBook}
                  onChange={(e) => setSaveToBook(e.target.checked)}
                  className="h-4 w-4 accent-blue-500"
                />
                Save this address for next time
              </label>
            )}
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
                    <p className="mt-0.5 text-xs text-sky-400">+ Courier {form.city ? format(courierPerProduct) : "(select district)"}</p>
                  </div>
                  <div className="text-sm font-bold">{format(item.price * item.quantity)}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-white/[0.08] pt-5">
              <p className="mb-2 text-sm font-semibold">🎟️ Have a coupon?</p>

              {appliedCoupon ? (
                <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                  <div>
                    <div className="font-mono text-sm font-extrabold tracking-wider text-emerald-300">
                      {appliedCoupon.code}
                    </div>
                    <div className="text-xs text-emerald-200/80">
                      You save {format(discount)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    className="rounded-lg px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/10"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase().replace(/\s/g, ""))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        applyCoupon();
                      }
                    }}
                    placeholder="Enter code"
                    maxLength={20}
                    className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 font-mono text-sm tracking-wider outline-none placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-600 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={applyCoupon}
                    disabled={couponChecking}
                    className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold hover:bg-blue-500 disabled:opacity-50"
                  >
                    {couponChecking ? "..." : "Apply"}
                  </button>
                </div>
              )}

              {couponMessage && (
                <p className="mt-2 text-xs text-red-300">⚠️ {couponMessage}</p>
              )}
              <Link href="/coupons" className="mt-2 inline-block text-xs font-semibold text-slate-400 hover:text-white">
                See available coupons
              </Link>
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
                <span>{form.city ? format(courierTotal) : "Select district"}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Coupon discount</span>
                  <span>- {format(discount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-white/[0.08] pt-4 font-bold text-white">
                <span>{t("checkout.total")}</span>
                <span className="text-lg text-emerald-400">{format(payable)}</span>
              </div>
            </div>

            <p className="mt-3 rounded-lg bg-white/[0.04] p-2.5 text-[11px] leading-relaxed text-slate-400">ⓘ {COURIER_NOTE}</p>

            <div className="mt-6 space-y-2">
              <p className="text-sm font-semibold text-white">Payment method</p>
              <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm ${paymentMethod === "sslcommerz" ? "border-orange-500 bg-orange-500/10" : "border-white/10"}`}>
                <input type="radio" name="paymentMethod" className="mt-1" checked={paymentMethod === "sslcommerz"} onChange={() => setPaymentMethod("sslcommerz")} />
                <span>
                  <b>Pay online</b>
                  <br />
                  <span className="text-xs text-slate-400">bKash, Nagad, cards</span>
                </span>
              </label>
              <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm ${paymentMethod === "cod" ? "border-orange-500 bg-orange-500/10" : "border-white/10"}`}>
                <input type="radio" name="paymentMethod" className="mt-1" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} />
                <span>
                  <b>{t("checkout.cashOnDelivery")}</b>
                  <br />
                  <span className="text-xs text-slate-400">Pay in cash when your order arrives</span>
                </span>
              </label>
            </div>

            <button type="submit" disabled={placing || !cart.items.length} className="mt-6 w-full rounded-2xl bg-orange-600 py-4 text-sm font-bold text-white shadow-lg shadow-orange-600/20 transition hover:bg-orange-500 hover:shadow-orange-500/30 disabled:cursor-not-allowed disabled:opacity-50">
              {placing ? t("checkout.processing") : paymentMethod === "cod" ? "Place Order (Cash on Delivery)" : "Proceed to Payment"}
            </button>
          </aside>
        </form>

        {showAddressForm && (
          <AddressForm
            onCancel={() => setShowAddressForm(false)}
            onSaved={(saved) => {
              setShowAddressForm(false);
              loadAddresses(saved._id);
            }}
          />
        )}
      </div>
    </main>
  );
}
