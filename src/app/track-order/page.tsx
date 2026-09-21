"use client";

import { useState } from "react";
import Link from "next/link";
import { useCurrency } from "@/lib/useCurrency";

type OrderItem = {
  name: string;
  price: number;
  quantity: number;
  image?: string;
};

type OrderDetails = {
  _id: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  items: OrderItem[];
  createdAt: string;
};

export default function TrackOrderPage() {
  const { format } = useCurrency();
  const [orderId, setOrderId] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [error, setError] = useState("");

  async function handleTrack(e: React.FormEvent) {
    e.preventDefault();
    if (!orderId.trim()) {
      setError("Please enter a valid Order ID");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setOrder(null);

      const res = await fetch(`/api/orders/${orderId.trim()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Order not found");
      }

      setOrder(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to fetch order details");
    } finally {
      setLoading(false);
    }
  }

  function getStepIndex(status: string) {
    const s = status.toLowerCase();
    if (s === "pending") return 0;
    if (s === "processing") return 1;
    if (s === "shipped") return 2;
    if (s === "delivered") return 3;
    return 0;
  }

  const steps = [
    { 
      id: "Pending", 
      label: "Order Placed", 
      icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6 sm:h-7 sm:w-7"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg> 
    },
    { 
      id: "Processing", 
      label: "Processing", 
      icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6 sm:h-7 sm:w-7"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> 
    },
    { 
      id: "Shipped", 
      label: "Shipped", 
      icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6 sm:h-7 sm:w-7"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h.008v.008H16.5v-.008z" /></svg> 
    },
    { 
      id: "Delivered", 
      label: "Delivered", 
      icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6 sm:h-7 sm:w-7"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> 
    }
  ];

  return (
    <main className="min-h-screen bg-[#020617] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <Link href="/" className="text-sm font-medium text-slate-400 hover:text-blue-400 transition-colors">
            ← Back to Home
          </Link>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">Track Your Order</h1>
          <p className="mt-2 text-sm text-slate-400">Enter your order ID below to check live status and delivery updates.</p>
        </div>

        {/* Modern Search Bar */}
        <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-3 rounded-2xl border border-white/[0.05] bg-slate-900/40 p-3 shadow-2xl backdrop-blur-xl">
          <input
            type="text"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="Enter Order ID (e.g. 6abc...)"
            className="flex-1 rounded-xl border border-white/5 bg-slate-950/50 px-5 py-4 text-sm outline-none placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-4 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] hover:shadow-blue-500/40 disabled:scale-100 disabled:opacity-50"
          >
            {loading ? "Searching..." : "Track Order"}
          </button>
        </form>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-4 text-center text-sm font-medium text-red-400 backdrop-blur-md">
            ⚠️ {error}
          </div>
        )}

        {order && (
          <div className="mt-8 space-y-6 rounded-3xl border border-white/[0.05] bg-slate-900/30 p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-6 border-b border-white/[0.05] pb-8">
              <div>
                <p className="mb-1 text-xs font-medium text-slate-500 uppercase tracking-wider">Order ID</p>
                <p className="font-mono text-sm font-bold text-blue-400">#{order._id}</p>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-slate-500 uppercase tracking-wider">Order Date</p>
                <p className="text-sm font-bold text-slate-200">{new Date(order.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-slate-500 uppercase tracking-wider">Total Amount</p>
                <p className="text-lg font-black text-emerald-400">{format(order.totalAmount)}</p>
              </div>
            </div>

            {/* Premium Animated Step Progress Bar */}
            <div className="py-8">
              <h3 className="mb-10 text-base font-bold text-slate-200">Delivery Status</h3>
              <div className="relative mx-auto px-2 sm:px-8">
                
                {/* Background Line */}
                <div className="absolute left-[10%] right-[10%] top-6 sm:top-7 -z-10 h-1.5 rounded-full bg-slate-800/80" />
                
                {/* Animated Glowing Fill Line */}
                <div 
                  className="absolute left-[10%] top-6 sm:top-7 -z-10 h-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 shadow-[0_0_15px_rgba(59,130,246,0.6)] transition-all duration-1000 ease-out"
                  style={{ width: `${(getStepIndex(order.status) / (steps.length - 1)) * 80}%` }}
                />
                
                <div className="flex items-start justify-between">
                  {steps.map((step, index) => {
                    const currentIdx = getStepIndex(order.status);
                    const isCompleted = index <= currentIdx;
                    const isCurrent = index === currentIdx;

                    return (
                      <div key={step.id} className="relative z-10 flex flex-col items-center gap-4 w-1/4">
                        {/* Icon Container */}
                        <div
                          className={`flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl border-2 transition-all duration-700 ${
                            isCompleted
                              ? "border-blue-500 bg-slate-900 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                              : "border-slate-800 bg-slate-950 text-slate-600"
                          } ${isCurrent ? "scale-110 shadow-[0_0_25px_rgba(59,130,246,0.6)] ring-4 ring-blue-500/20" : ""}`}
                        >
                          {step.icon}
                        </div>
                        
                        {/* Label */}
                        <span className={`text-center text-xs sm:text-sm font-bold transition-colors duration-500 ${
                          isCurrent ? "text-blue-400" : isCompleted ? "text-slate-300" : "text-slate-600"
                        }`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Order Items List */}
            <div className="border-t border-white/[0.05] pt-8">
              <h4 className="mb-6 text-sm font-bold text-slate-300">Ordered Items</h4>
              <div className="space-y-3">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-2xl bg-slate-900/40 border border-white/[0.02] p-4 transition-colors hover:bg-slate-900/60">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800/50 text-xl shadow-inner">
                        📦
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-200">{item.name}</p>
                        <p className="mt-1 text-xs font-medium text-slate-500">Qty: {item.quantity} × {format(item.price)}</p>
                      </div>
                    </div>
                    <div className="text-sm font-black text-slate-200">{format(item.price * item.quantity)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
