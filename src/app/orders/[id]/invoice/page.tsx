"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCustomerUserId } from "@/lib/customerAuth";
import { useSite } from "@/lib/siteContext";
import { COURIER_NOTE } from "@/lib/refundPolicy";

type Item = { name: string; price: number; quantity: number; courierCharge: number };
type Details = {
  order: {
    _id: string;
    status: string;
    paymentMethod?: string;
    paymentStatus?: string;
    totalAmount: number;
    currency?: string;
    createdAt: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    deliveryAddress?: { fullName?: string; phone?: string; address?: string; area?: string; city?: string };
    items: Item[];
  };
  breakdown: { productTotal: number; courier: number; total: number; refundable: number };
};

/** The customer's own invoice. "Download" opens the print dialog: choose "Save as PDF". */
export default function CustomerInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const site = useSite();
  const [data, setData] = useState<Details | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const userId = getCustomerUserId();
    if (!userId) {
      router.replace(`/login?redirect=/orders/${id}/invoice`);
      return;
    }
    fetch(`/api/orders/${id}/details`, { headers: { "x-user-id": userId }, cache: "no-store" })
      .then((r) => r.json())
      .then((d) => (d.success ? setData(d) : setError(d.message || "Unable to load the invoice.")))
      .catch(() => setError("Unable to load the invoice."));
  }, [id, router]);

  if (error) return <main className="min-h-screen bg-white p-8 text-red-600">{error}</main>;
  if (!data) return <main className="min-h-screen bg-white p-8 text-slate-500">Loading...</main>;

  const { order, breakdown } = data;
  const cur = order.currency || "BDT";
  const addr = order.deliveryAddress;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 print:bg-white print:p-0">
      <style>{`@media print { .no-print { display: none !important; } body { background: #fff !important; } }`}</style>

      <div className="no-print mx-auto mb-4 flex max-w-3xl items-center justify-between">
        <Link href={`/orders/${order._id}`} className="text-sm text-slate-600">← Back to order</Link>
        <button onClick={() => window.print()} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold !text-white" style={{ color: "#ffffff" }}>
          ⬇ Download / Print PDF
        </button>
      </div>

      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-sm sm:p-10 print:rounded-none print:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-slate-900 pb-5">
          <div className="flex items-center gap-3">
            {site.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={site.logoUrl} alt="" className="h-12 w-12 object-contain" />
            )}
            <div>
              <h1 className="text-2xl font-extrabold">{site.siteName}</h1>
              {site.tagline && <p className="text-xs text-slate-500">{site.tagline}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-widest text-slate-500">Invoice</p>
            <p className="text-xl font-extrabold">#{order._id.slice(-8).toUpperCase()}</p>
            <p className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleString()}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-5 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Bill / Ship to</p>
            <p className="mt-1 font-bold">{addr?.fullName || order.customerName}</p>
            <p className="text-slate-600">{[addr?.address, addr?.area, addr?.city].filter(Boolean).join(", ")}</p>
            <p className="text-slate-600">{addr?.phone || order.customerPhone}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Order</p>
            <p className="mt-1 capitalize">Status: <b>{order.status}</b></p>
            <p>Payment: <b>{order.paymentMethod === "cod" ? "Cash on Delivery" : "Online"}</b> · <span className="capitalize">{order.paymentStatus || "pending"}</span></p>
          </div>
        </div>

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="bg-slate-900 text-left text-white">
              <th className="p-2.5">#</th>
              <th className="p-2.5">Product</th>
              <th className="p-2.5 text-right">Qty</th>
              <th className="p-2.5 text-right">Unit price</th>
              <th className="p-2.5 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((i, n) => (
              <tr key={n} className="border-b border-slate-200">
                <td className="p-2.5">{n + 1}</td>
                <td className="p-2.5">{i.name}</td>
                <td className="p-2.5 text-right">{i.quantity}</td>
                <td className="p-2.5 text-right">{cur} {i.price}</td>
                <td className="p-2.5 text-right font-semibold">{cur} {i.price * i.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 ml-auto w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between text-slate-600"><span>Products</span><span>{cur} {breakdown.productTotal}</span></div>
          {breakdown.courier > 0 && (
            <div className="flex justify-between text-slate-600"><span>Courier charge</span><span>{cur} {breakdown.courier}</span></div>
          )}
          <div className="flex justify-between rounded-lg border-2 border-slate-900 p-3 text-base font-extrabold">
            <span>Total</span><span>{cur} {order.totalAmount}</span>
          </div>
        </div>

        {breakdown.courier > 0 && (
          <p className="mt-3 text-right text-[11px] leading-snug text-slate-500">
            If cancelled or returned, you get back {cur} {breakdown.refundable}. {COURIER_NOTE}
          </p>
        )}

        <p className="mt-8 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
          Thank you for shopping with {site.siteName}.
          {(site.supportEmail || site.supportPhone) && <> Questions? {[site.supportEmail, site.supportPhone].filter(Boolean).join(" · ")}</>}
        </p>
      </div>
    </main>
  );
}
