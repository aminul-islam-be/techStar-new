"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type CSSProperties } from "react";
import { shippedQuantities } from "@/lib/shipments";

type Shipment = {
  _id: string;
  courierName?: string;
  trackingNumber?: string;
  status: "preparing" | "shipped" | "delivered";
  shippedAt?: string;
  deliveredAt?: string;
  items: { productId: string; name: string; quantity: number }[];
};

type AdminOrder = {
  _id: string;
  status: string;
  paymentStatus: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: { fullName: string; phone: string; address: string; area?: string; city?: string };
  deliveryInstructions?: string;
  estimatedDeliveryDate?: string;
  items: { productId: string; name: string; quantity: number }[];
  shipments?: Shipment[];
  manualPayment?: { trxId: string; status: string };
};

const card: CSSProperties = { background: "#0f172a", border: "1px solid #1e293b", borderRadius: "15px", padding: "18px", marginBottom: "16px" };
const field: CSSProperties = { width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: "9px", border: "1px solid #334155", background: "#020617", color: "#fff" };
const button = (background: string): CSSProperties => ({ padding: "9px 14px", borderRadius: "9px", border: "none", background, color: "#fff", fontWeight: 700, fontSize: "13px", cursor: "pointer" });

// Dhaka calendar day as YYYY-MM-DD (for the date box) and as a readable date
const dayOf = (value?: string) => (value ? new Date(value).toLocaleDateString("sv-SE", { timeZone: "Asia/Dhaka" }) : "");
const niceDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Dhaka" }) : "";

function ShipmentCard({
  shipment,
  index,
  busy,
  onSave,
  onStatus,
  onDelete,
}: {
  shipment: Shipment;
  index: number;
  busy: boolean;
  onSave: (courierName: string, trackingNumber: string) => void;
  onStatus: (status: "shipped" | "delivered") => void;
  onDelete: () => void;
}) {
  const [courierName, setCourierName] = useState(shipment.courierName || "");
  const [trackingNumber, setTrackingNumber] = useState(shipment.trackingNumber || "");

  return (
    <div style={{ padding: "13px", borderRadius: "10px", background: "#020617", border: "1px solid #1e293b" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
        <strong>Shipment {index + 1}</strong>
        <span style={{ fontSize: "12px", fontWeight: 800, textTransform: "uppercase", color: shipment.status === "delivered" ? "#86efac" : shipment.status === "shipped" ? "#fbbf24" : "#cbd5e1" }}>
          {shipment.status}
        </span>
      </div>
      <ul style={{ margin: "8px 0", paddingLeft: "18px", color: "#cbd5e1", fontSize: "13px" }}>
        {shipment.items.map((item) => (
          <li key={item.productId}>{item.name} × {item.quantity}</li>
        ))}
      </ul>
      <div style={{ display: "grid", gap: "8px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <input value={courierName} onChange={(e) => setCourierName(e.target.value)} placeholder="Courier name" style={field} />
        <input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="Tracking number" style={field} />
      </div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
        <button disabled={busy} onClick={() => onSave(courierName, trackingNumber)} style={button("#2563eb")}>Save courier & tracking</button>
        {shipment.status === "preparing" && <button disabled={busy} onClick={() => onStatus("shipped")} style={button("#d97706")}>Mark shipped</button>}
        {shipment.status === "shipped" && <button disabled={busy} onClick={() => onStatus("delivered")} style={button("#059669")}>Mark delivered</button>}
        {shipment.status === "preparing" && <button disabled={busy} onClick={onDelete} style={button("#7f1d1d")}>Delete</button>}
      </div>
      {shipment.shippedAt && <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: "12px" }}>Shipped {niceDate(shipment.shippedAt)}</p>}
      {shipment.deliveredAt && <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "12px" }}>Delivered {niceDate(shipment.deliveredAt)}</p>}
    </div>
  );
}

export default function AdminOrderDeliveryPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [estimate, setEstimate] = useState("");
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [courierName, setCourierName] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let ignore = false;
    fetch(`/api/admin/orders/${id}`, { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || "Unable to load this order.");
        return data.order as AdminOrder;
      })
      .then((loaded) => {
        if (ignore) return;
        setOrder(loaded);
        setEstimate(dayOf(loaded.estimatedDeliveryDate));
      })
      .catch((err: unknown) => {
        if (!ignore) setError(err instanceof Error ? err.message : "Unable to load this order.");
      });
    return () => {
      ignore = true;
    };
  }, [id]);

  async function send(body: Record<string, unknown>, done: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/admin/orders/${id}/delivery`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Unable to save.");
      setOrder(data.order);
      setEstimate(dayOf(data.order.estimatedDeliveryDate));
      setMessage(done);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (!order) {
    return (
      <main style={{ minHeight: "100vh", background: "#020617", color: "#f8fafc", padding: "30px 16px" }}>
        {error ? <p style={{ color: "#fecaca" }}>⚠ {error}</p> : "Loading..."}
      </main>
    );
  }

  const sent = shippedQuantities(order.shipments);
  const remaining = order.items
    .map((item) => ({ ...item, left: item.quantity - (sent.get(String(item.productId)) || 0) }))
    .filter((item) => item.left > 0);
  const addr = order.deliveryAddress;
  const cancelled = order.status === "cancelled";

  return (
    <main style={{ minHeight: "100vh", background: "#020617", color: "#f8fafc", padding: "25px 16px 50px" }}>
      <div style={{ maxWidth: "860px", margin: "0 auto" }}>
        <Link href="/admin/orders" style={{ color: "#94a3b8", textDecoration: "none", fontSize: "14px" }}>← All orders</Link>
        <h1 style={{ margin: "14px 0 4px", fontSize: "28px", fontWeight: 800 }}>🚚 Delivery · #{order._id.slice(-8).toUpperCase()}</h1>
        <p style={{ margin: "0 0 18px", color: "#94a3b8" }}>
          Order: <b style={{ color: "#fff" }}>{order.status}</b> · Payment: <b style={{ color: "#fff" }}>{order.paymentStatus}</b>
        </p>

        {order.manualPayment && order.manualPayment.status !== "verified" && (
          <div style={{ padding: "12px 14px", marginBottom: "15px", borderRadius: "9px", background: "#451a03", border: "1px solid #92400e", color: "#fde68a" }}>
            💸 Send money payment is not verified yet (TrxID {order.manualPayment.trxId}). Check it on the Orders page before you ship.
          </div>
        )}
        {message && <div style={{ padding: "12px 14px", marginBottom: "15px", borderRadius: "9px", background: "#052e16", border: "1px solid #166534", color: "#bbf7d0" }}>✓ {message}</div>}
        {error && <div style={{ padding: "12px 14px", marginBottom: "15px", borderRadius: "9px", background: "#450a0a", border: "1px solid #991b1b", color: "#fecaca" }}>⚠ {error}</div>}

        <section style={card}>
          <h2 style={{ margin: "0 0 8px", fontSize: "16px" }}>Customer</h2>
          <p style={{ margin: 0, color: "#cbd5e1", fontSize: "14px" }}>
            {addr?.fullName || order.customerName} · 📱 {addr?.phone || order.customerPhone}
          </p>
          <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: "14px" }}>
            {[addr?.address, addr?.area, addr?.city].filter(Boolean).join(", ")}
          </p>
          {order.deliveryInstructions && (
            <p style={{ margin: "10px 0 0", padding: "10px", borderRadius: "9px", background: "#020617", color: "#fde68a", fontSize: "13px" }}>
              📝 Customer note: {order.deliveryInstructions}
            </p>
          )}
        </section>

        <section style={card}>
          <h2 style={{ margin: "0 0 10px", fontSize: "16px" }}>Estimated delivery</h2>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <input type="date" value={estimate} onChange={(e) => setEstimate(e.target.value)} style={{ ...field, width: "auto" }} />
            <button disabled={busy} onClick={() => send({ action: "setEstimate", estimatedDeliveryDate: estimate }, "Estimated date saved.")} style={button("#2563eb")}>Save date</button>
            <button disabled={busy} onClick={() => send({ action: "setEstimate", estimatedDeliveryDate: "" }, "Estimated date removed.")} style={button("#334155")}>Clear</button>
          </div>
        </section>

        <section style={card}>
          <h2 style={{ margin: "0 0 10px", fontSize: "16px" }}>Shipments ({order.shipments?.length || 0})</h2>
          {(order.shipments || []).length === 0 && <p style={{ color: "#94a3b8", fontSize: "14px" }}>No shipment yet.</p>}
          <div style={{ display: "grid", gap: "12px" }}>
            {(order.shipments || []).map((shipment, index) => (
              <ShipmentCard
                key={shipment._id}
                shipment={shipment}
                index={index}
                busy={busy}
                onSave={(name, tracking) => send({ action: "updateShipment", shipmentId: shipment._id, courierName: name, trackingNumber: tracking }, "Courier and tracking saved.")}
                onStatus={(status) => send({ action: "updateShipment", shipmentId: shipment._id, status }, `Marked ${status}.`)}
                onDelete={() => {
                  if (window.confirm("Delete this shipment?")) send({ action: "deleteShipment", shipmentId: shipment._id }, "Shipment deleted.");
                }}
              />
            ))}
          </div>
        </section>

        <section style={card}>
          <h2 style={{ margin: "0 0 10px", fontSize: "16px" }}>New shipment</h2>
          {cancelled ? (
            <p style={{ color: "#fca5a5", fontSize: "14px" }}>This order is cancelled, so nothing can be shipped.</p>
          ) : remaining.length === 0 ? (
            <p style={{ color: "#86efac", fontSize: "14px" }}>Everything in this order has been sent.</p>
          ) : (
            <>
              <div style={{ display: "grid", gap: "8px" }}>
                {remaining.map((item) => (
                  <div key={item.productId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap", padding: "10px", borderRadius: "9px", background: "#020617" }}>
                    <span style={{ fontSize: "14px" }}>
                      {item.name} <span style={{ color: "#64748b" }}>· {item.left} left</span>
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={item.left}
                      value={picked[item.productId] || 0}
                      onChange={(e) => {
                        const qty = Math.min(item.left, Math.max(0, Math.floor(Number(e.target.value) || 0)));
                        setPicked((current) => ({ ...current, [item.productId]: qty }));
                      }}
                      style={{ ...field, width: "110px" }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gap: "8px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginTop: "12px" }}>
                <input value={courierName} onChange={(e) => setCourierName(e.target.value)} placeholder="Courier name" style={field} />
                <input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="Tracking number (can add later)" style={field} />
              </div>
              <button
                disabled={busy || Object.values(picked).every((qty) => !qty)}
                onClick={async () => {
                  const items = Object.entries(picked)
                    .filter(([, qty]) => qty > 0)
                    .map(([productId, quantity]) => ({ productId, quantity }));
                  const ok = await send({ action: "addShipment", items, courierName, trackingNumber }, "Shipment created.");
                  if (ok) {
                    setPicked({});
                    setCourierName("");
                    setTrackingNumber("");
                  }
                }}
                style={{ ...button("#7c3aed"), marginTop: "12px", width: "100%", padding: "12px" }}
              >
                Create shipment
              </button>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
