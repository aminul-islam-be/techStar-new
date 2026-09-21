"use client";

import { useEffect, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import { useCurrency } from "@/lib/useCurrency";

export default function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { format } = useCurrency();
  const { id } = usePromise(params);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setOrder(data.order);
        } else {
          setError("Order not found.");
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load order details.");
        setLoading(false);
      });
  }, [id]);

  async function handleSSLCommerzPayment() {
    try {
      setPaying(true);
      setError("");

      const response = await fetch("/api/payment/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: id }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to initiate payment.");
      }

      if (data.gatewayUrl) {
        window.location.href = data.gatewayUrl;
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Payment initiation failed.");
      setPaying(false);
    }
  }

  if (loading) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-bold">Loading payment details...</div>;
  if (error || !order) return <div className="min-h-screen bg-slate-950 text-red-400 flex items-center justify-center font-bold">{error || "Order not found."}</div>;

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">⚡</div>
          <h1 className="text-2xl font-black">Complete Payment</h1>
          <p className="text-sm text-slate-400 mt-1">Order ID: #{order._id.toString().slice(-8).toUpperCase()}</p>
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
            <span className="text-blue-400">{format(order.totalAmount)}</span>
          </div>
        </div>

        {error && <div className="bg-red-950/50 border border-red-800 text-red-300 p-3 rounded-lg text-sm mb-4">⚠️ {error}</div>}

        <button
          onClick={handleSSLCommerzPayment}
          disabled={paying}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 font-bold rounded-xl shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {paying ? "Connecting to Gateway..." : "Pay with SSLCommerz (Sandbox)"}
        </button>

        <button
          onClick={() => router.push("/orders")}
          className="w-full mt-3 py-2.5 bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white font-medium rounded-xl transition text-sm"
        >
          Pay Later / View Orders
        </button>
      </div>
    </main>
  );
}
