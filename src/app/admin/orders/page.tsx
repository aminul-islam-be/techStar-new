"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type OrderItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
};

type Order = {
  _id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  items: OrderItem[];
  totalAmount: number;
  currency: string;
  paymentMethod: string;
  paymentStatus: "pending" | "paid" | "failed";
  status:
    | "pending"
    | "confirmed"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled";
  deliveryAddress: {
    fullName: string;
    phone: string;
    address: string;
    city?: string;
    area?: string;
  };
  createdAt?: string;
  cancelledAt?: string;
  deliveredAt?: string;
};

const statusOptions = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const paymentOptions = [
  "pending",
  "paid",
  "failed",
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  async function loadOrders() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (status) {
        params.set("status", status);
      }

      const response = await fetch(
        `/api/admin/orders?${params.toString()}`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to load orders."
        );
      }

      setOrders(
        Array.isArray(data.orders)
          ? data.orders
          : []
      );
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load orders."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, [status]);

  async function updateOrder(
    id: string,
    updates: {
      status?: Order["status"];
      paymentStatus?: Order["paymentStatus"];
    }
  ) {
    try {
      setError("");
      setMessage("");

      const response = await fetch(
        "/api/admin/orders",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id,
            ...updates,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to update order."
        );
      }

      setOrders((current) =>
        current.map((order) =>
          order._id === id
            ? {
                ...order,
                ...updates,
              }
            : order
        )
      );

      setMessage(data.message);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update order."
      );
    }
  }
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#f8fafc",
        padding: "25px 16px 50px",
      }}
    >
      <div
        style={{
          maxWidth: "1180px",
          margin: "0 auto",
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "15px",
            flexWrap: "wrap",
            marginBottom: "25px",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "32px",
                fontWeight: 800,
              }}
            >
              🛒 Orders
            </h1>

            <p
              style={{
                margin: "6px 0 0",
                color: "#94a3b8",
              }}
            >
              Manage TechStar customer orders
            </p>
          </div>

          <Link
            href="/admin"
            style={{
              display: "inline-flex",
              padding: "10px 15px",
              borderRadius: "9px",
              background: "#0f172a",
              border: "1px solid #334155",
              color: "#fff",
              textDecoration: "none",
            }}
          >
            ← Admin Dashboard
          </Link>
        </header>

        <section
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            marginBottom: "20px",
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                loadOrders();
              }
            }}
            placeholder="Search customer, phone or email..."
            style={{
              flex: "1 1 280px",
              minWidth: "0",
              padding: "12px 14px",
              borderRadius: "9px",
              border: "1px solid #334155",
              background: "#0f172a",
              color: "#fff",
              outline: "none",
            }}
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{
              padding: "12px 14px",
              borderRadius: "9px",
              border: "1px solid #334155",
              background: "#0f172a",
              color: "#fff",
            }}
          >
            <option value="">All Orders</option>

            {statusOptions.map((item) => (
              <option key={item} value={item}>
                {item.charAt(0).toUpperCase() +
                  item.slice(1)}
              </option>
            ))}
          </select>

          <button
            onClick={loadOrders}
            style={{
              padding: "12px 16px",
              borderRadius: "9px",
              border: "1px solid #2563eb",
              background: "#2563eb",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            🔎 Search
          </button>
        </section>

        {message && (
          <div
            style={{
              padding: "12px 14px",
              marginBottom: "15px",
              borderRadius: "9px",
              background: "#052e16",
              border: "1px solid #166534",
              color: "#bbf7d0",
            }}
          >
            ✓ {message}
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "12px 14px",
              marginBottom: "15px",
              borderRadius: "9px",
              background: "#450a0a",
              border: "1px solid #991b1b",
              color: "#fecaca",
            }}
          >
            ⚠ {error}
          </div>
        )}

        {loading ? (
          <div
            style={{
              padding: "50px 20px",
              textAlign: "center",
              color: "#94a3b8",
            }}
          >
            Loading orders...
          </div>
        ) : orders.length === 0 ? (
          <div
            style={{
              padding: "55px 20px",
              textAlign: "center",
              background: "#0f172a",
              border: "1px solid #1e293b",
              borderRadius: "15px",
            }}
          >
            <div style={{ fontSize: "55px" }}>🛒</div>

            <h2>No Orders Found</h2>

            <p style={{ color: "#94a3b8" }}>
              Orders will appear here after customers place
              orders.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "16px",
            }}
          >
            {orders.map((order) => (
              <article
                key={order._id}
                style={{
                  background: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: "15px",
                  padding: "18px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "15px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div
                      style={{
                        color: "#60a5fa",
                        fontSize: "12px",
                        fontWeight: 800,
                        marginBottom: "5px",
                      }}
                    >
                      ORDER #{order._id.slice(-8).toUpperCase()}
                    </div>

                    <h2
                      style={{
                        margin: 0,
                        fontSize: "19px",
                      }}
                    >
                      {order.customerName}
                    </h2>

                    <p
                      style={{
                        margin: "6px 0",
                        color: "#94a3b8",
                      }}
                    >
                      📱 {order.customerPhone}
                    </p>

                    <p
                      style={{
                        margin: 0,
                        color: "#94a3b8",
                      }}
                    >
                      ✉️ {order.customerEmail ||
                        "No email"}
                    </p>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      alignItems: "flex-end",
                    }}
                  >
                    <span
                      style={{
                        padding: "6px 10px",
                        borderRadius: "999px",
                        background:
                          order.status === "delivered"
                            ? "#14532d"
                            : order.status ===
                                "cancelled"
                              ? "#7f1d1d"
                              : "#1e3a8a",
                        fontSize: "12px",
                        fontWeight: 800,
                      }}
                    >
                      {order.status.toUpperCase()}
                    </span>

                    <span
                      style={{
                        color:
                          order.paymentStatus === "paid"
                            ? "#86efac"
                            : "#fbbf24",
                        fontSize: "12px",
                        fontWeight: 700,
                      }}
                    >
                      💳 Payment:{" "}
                      {order.paymentStatus}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: "16px",
                    paddingTop: "15px",
                    borderTop: "1px solid #1e293b",
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 10px",
                      fontSize: "15px",
                    }}
                  >
                    📦 Products
                  </h3>

                  <div
                    style={{
                      display: "grid",
                      gap: "8px",
                    }}
                  >
                    {order.items.map((item, index) => (
                      <div
                        key={`${order._id}-${index}`}
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          gap: "10px",
                          padding: "9px",
                          borderRadius: "8px",
                          background: "#020617",
                        }}
                      >
                        <span>
                          {item.name} × {item.quantity}
                        </span>

                        <strong>
                          {order.currency}{" "}
                          {item.price * item.quantity}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: "15px",
                    padding: "13px",
                    borderRadius: "9px",
                    background: "#020617",
                  }}
                >
                  <div
                    style={{
                      color: "#94a3b8",
                      fontSize: "12px",
                      marginBottom: "4px",
                    }}
                  >
                    📍 Delivery Address
                  </div>

                  <div style={{ fontSize: "14px" }}>
                    {order.deliveryAddress?.address}
                    {order.deliveryAddress?.area
                      ? `, ${order.deliveryAddress?.area}`
                      : ""}
                    {order.deliveryAddress?.city
                      ? `, ${order.deliveryAddress?.city}`
                      : ""}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "15px",
                    flexWrap: "wrap",
                    marginTop: "16px",
                  }}
                >
                  <div>
                    <span
                      style={{
                        color: "#94a3b8",
                        fontSize: "12px",
                      }}
                    >
                      Total Amount
                    </span>

                    <div
                      style={{
                        fontSize: "21px",
                        fontWeight: 900,
                        marginTop: "3px",
                      }}
                    >
                      {order.currency}{" "}
                      {order.totalAmount}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    <select
                      value={order.status}
                      onChange={(e) =>
                        updateOrder(order._id, {
                          status: e.target.value as Order["status"],
                        })
                      }
                      style={{
                        padding: "9px 10px",
                        borderRadius: "8px",
                        background: "#020617",
                        color: "#fff",
                        border: "1px solid #334155",
                      }}
                    >
                      {statusOptions.map((item) => (
                        <option
                          key={item}
                          value={item}
                        >
                          {item}
                        </option>
                      ))}
                    </select>

                    <select
                      value={order.paymentStatus}
                      onChange={(e) =>
                        updateOrder(order._id, {
                          paymentStatus: e.target.value as Order["paymentStatus"],
                        })
                      }
                      style={{
                        padding: "9px 10px",
                        borderRadius: "8px",
                        background: "#020617",
                        color: "#fff",
                        border: "1px solid #334155",
                      }}
                    >
                      {paymentOptions.map((item) => (
                        <option
                          key={item}
                          value={item}
                        >
                          Payment: {item}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: "10px",
                    color: "#64748b",
                    fontSize: "12px",
                  }}
                >
                  🕐{" "}
                  {order.createdAt
                    ? new Date(
                        order.createdAt
                      ).toLocaleString()
                    : "Date unavailable"}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

