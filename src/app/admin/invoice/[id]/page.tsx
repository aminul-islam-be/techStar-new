"use client";

import { useEffect, useState, use as usePromise } from "react";
import { useCurrency } from "@/lib/useCurrency";

export default function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { format } = useCurrency();
  const { id } = usePromise(params);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setOrder(data.order);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-10 text-center text-xl font-bold">Loading Invoice...</div>;
  if (!order) return <div className="p-10 text-center text-red-500 font-bold">Order not found!</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-4 print:p-0 print:bg-white text-black">
      
      {/* Action Bar (Hidden during print) */}
      <div className="mx-auto max-w-3xl mb-4 flex justify-between print:hidden">
        <button onClick={() => window.history.back()} className="px-5 py-2.5 bg-slate-800 text-white font-bold rounded-xl shadow hover:bg-slate-700">← Back</button>
        <button onClick={() => window.print()} className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-500 flex items-center gap-2">
          🖨️ Print Invoice
        </button>
      </div>

      {/* Invoice A4 Container */}
      <div className="mx-auto max-w-3xl bg-white p-8 sm:p-12 shadow-xl print:shadow-none print:p-0 rounded-2xl print:rounded-none">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-gray-200 pb-6 mb-6">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">⚡ TechStar</h1>
            <p className="text-sm text-gray-500 mt-1 font-medium">TechStar Smart Marketplace</p>
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-black text-gray-300 uppercase tracking-widest">Invoice</h2>
            <p className="text-sm font-bold text-gray-800 mt-2">Order #{order._id.toString().slice(-8).toUpperCase()}</p>
            <p className="text-sm text-gray-500 font-medium">Date: {new Date(order.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Addresses */}
        <div className="flex justify-between mb-8">
          <div>
            <p className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">From:</p>
            <p className="font-bold text-base text-gray-800">TechStar Warehouse</p>
            <p className="text-sm text-gray-600">Level 4, Block B, Tech Park</p>
            <p className="text-sm text-gray-600">Dhaka, Bangladesh</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">Ship To (Customer):</p>
            <p className="font-extrabold text-lg text-blue-600">{order.deliveryAddress?.fullName || order.customerName}</p>
            <p className="text-sm font-bold text-gray-700">{order.deliveryAddress?.phone || order.customerPhone}</p>
            <p className="text-sm text-gray-600 max-w-[250px] ml-auto mt-1">{order.deliveryAddress?.address}</p>
            <p className="text-sm text-gray-600 font-medium">{order.deliveryAddress?.area}, {order.deliveryAddress?.city}</p>
          </div>
        </div>
        {/* Table */}
        <table className="w-full text-left mb-8 border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-800 text-sm text-gray-800">
              <th className="pb-3 font-bold">Item Description</th>
              <th className="pb-3 text-center font-bold">Qty</th>
              <th className="pb-3 text-right font-bold">Price</th>
              <th className="pb-3 text-right font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item: any, i: number) => (
              <tr key={i} className="border-b border-gray-100 text-sm">
                <td className="py-3.5 font-semibold text-gray-700">{item.name}</td>
                <td className="py-3.5 text-center font-medium text-gray-600">{item.quantity}</td>
                <td className="py-3.5 text-right font-medium text-gray-600">{format(item.price)}</td>
                <td className="py-3.5 text-right font-bold text-gray-900">{format(item.price * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals & Payment */}
        <div className="flex justify-between items-end mt-4">
          <div className="w-1/2 bg-gray-50 p-4 rounded-xl border border-gray-100 print:border-none print:bg-transparent print:p-0">
            <p className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mb-2">Payment Details:</p>
            <p className="text-sm text-gray-700 mb-1"><span className="font-semibold text-gray-900">Method:</span> <span className="uppercase font-bold text-blue-600">{order.paymentMethod}</span></p>
            <p className="text-sm text-gray-700"><span className="font-semibold text-gray-900">Status:</span> <span className="uppercase font-bold">{order.paymentStatus}</span></p>
          </div>
          <div className="w-1/2 text-right space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span className="text-gray-500">Subtotal:</span>
              <span className="text-gray-800">{format(order.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm font-medium">
              <span className="text-gray-500">Delivery Fee:</span>
              <span className="text-gray-800">Calculated Later</span>
            </div>
            <div className="flex justify-between text-xl font-black border-t-2 border-gray-800 pt-3 mt-3 text-gray-900">
              <span>Grand Total:</span>
              <span>{format(order.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-xs font-medium text-gray-400 border-t border-gray-200 pt-5 print:mt-24">
          Thank you for shopping with TechStar! If you have any questions, please contact our support at <span className="text-gray-500">01922964696</span>.
        </div>

      </div>
    </div>
  );
}
