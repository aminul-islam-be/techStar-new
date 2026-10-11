"use client";

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/currency";

export default function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // the login cookie is sent automatically; the server returns the full order only to its owner
    fetch(`/api/orders/${id}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setOrder(data.order);
        else setError(data.message || "Order not found.");
      })
      .catch(() => setError("Failed to load order details."))
      .finally(() => setLoading(false));
  }, [id]);

  async function handlePayment() {
    try {
      setPaying(true);
      setError("");

      const response = await fetch("/api/payment/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: id }),
      });
      const data = await response.json();

      if (!response.ok || !data.success || !data.gatewayUrl) {
        throw new Error(data.message || "Payment could not be started. Please try again.");
      }
      window.location.href = data.gatewayUrl;
    } catch (err: any) {
      setError(err.message || "Payment could not be started.");
      setPaying(false);
    }
  }

  const shell = (children: React.ReactNode) => (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center space-y-4">{children}</div>
    </main>
  );

  if (loading) return shell(<p className="font-bold">Loading payment details...</p>);
  if (!order) return shell(<p className="text-red-400 font-bold">{error || "Order not found."}</p>);

  if (order.paymentStatus === "paid") {
    return shell(
      <>
        <div className="text-4xl">✅</div>
        <h1 className="text-2xl font-black">Already paid</h1>
        <Link href="/orders" className="inline-block w-full py-3 bg-blue-600 rounded-xl font-bold">View my orders</Link>
      </>
    );
  }

  if (order.status === "cancelled" || order.paymentMethod !== "sslcommerz") {
    return shell(
      <>
        <h1 className="text-2xl font-black">
          {order.status === "cancelled" ? "This order was cancelled" : "This order is paid on delivery"}
        </h1>
        <Link href="/orders" className="inline-block w-full py-3 bg-slate-800 rounded-xl font-bold">View my orders</Link>
      </>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">⚡</div>
          <h1 className="text-2xl font-black">Complete Payment</h1>
          <p className="text-sm text-slate-400 mt-1">Order ID: #{String(order._id).slice(-8).toUpperCase()}</p>
        </div>

        <div className="bg-slate-950 rounded-xl p-4 mb-6 border border-slate-800/60 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Customer Name:</span>
            <span className="font-semibold">{order.customerName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Phone:</span>
            <span className="font-semibold">{order.customerPhone}</span>
          </div>
          <div className="flex justify-between text-base font-bold border-t border-slate-800 pt-2 mt-2">
            <span>Total Payable:</span>
            {/* the gateway charges BDT, so the total is shown in BDT (no currency conversion here) */}
            <span className="text-blue-400">{formatCurrency(order.totalAmount, "BDT", "৳")}</span>
          </div>
        </div>

        {error && <div className="bg-red-950/50 border border-red-800 text-red-300 p-3 rounded-lg text-sm mb-4">⚠️ {error}</div>}

        <button
          onClick={handlePayment}
          disabled={paying}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 font-bold rounded-xl shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {paying ? "Connecting to Gateway..." : "Pay Now (bKash, Nagad, Card)"}
        </button>

        <Link
          href="/orders"
          className="block w-full mt-3 py-2.5 bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white font-medium rounded-xl transition text-sm text-center"
        >
          Pay Later / View Orders
        </Link>
      </div>
    </main>
  );
}
