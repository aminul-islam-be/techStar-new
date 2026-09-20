"use client";

import { useEffect, useState, use as usePromise } from "react";
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
};

export default function OrderInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = usePromise(params);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadOrder() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`/api/admin/orders/${id}`, {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "Unable to load order."
          );
        }

        if (!cancelled) {
          setOrder(data.order);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load order."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadOrder();

    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <>
      {/* Print rules: hide screen-only chrome, force clean white
          page for printing / "Save as PDF". */}
      <style>{`
        @media print {
          .invoice-no-print {
            display: none !important;
          }
          .invoice-page {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            max-width: 100% !important;
          }
          body {
            background: #ffffff !important;
          }
        }

        @page {
          size: A4;
          margin: 14mm;
        }
      `}</style>

      <main
        style={{
          minHeight: "100vh",
          background: "#e2e8f0",
          padding: "24px 16px 60px",
        }}
      >
        <div
          className="invoice-no-print"
          style={{
            maxWidth: "820px",
            margin: "0 auto 18px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/admin/orders"
            style={{
              display: "inline-flex",
              padding: "10px 15px",
              borderRadius: "9px",
              background: "#0f172a",
              border: "1px solid #334155",
              color: "#fff",
              textDecoration: "none",
              fontSize: "14px",
            }}
          >
            {"← Back to Orders"}
          </Link>

          {order && (
            <button
              onClick={() => window.print()}
              style={{
                padding: "10px 18px",
                borderRadius: "9px",
                border: "1px solid #2563eb",
                background: "#2563eb",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              🖨️ Print / Save as PDF
            </button>
          )}
        </div>

        {loading && (
          <div
            className="invoice-no-print"
            style={{
              maxWidth: "820px",
              margin: "0 auto",
              textAlign: "center",
              color: "#334155",
              padding: "40px",
            }}
          >
            Loading invoice...
          </div>
        )}

        {!loading && error && (
          <div
            className="invoice-no-print"
            style={{
              maxWidth: "820px",
              margin: "0 auto",
              background: "#fee2e2",
              color: "#7f1d1d",
              padding: "16px",
              borderRadius: "10px",
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}

        {!loading && order && (
          <div
            className="invoice-page"
            style={{
              maxWidth: "820px",
              margin: "0 auto",
              background: "#ffffff",
              color: "#0f172a",
              borderRadius: "10px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
              padding: "40px",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "20px",
                flexWrap: "wrap",
                borderBottom: "3px solid #0f172a",
                paddingBottom: "18px",
                marginBottom: "24px",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "26px",
                    fontWeight: 900,
                    letterSpacing: "0.5px",
                  }}
                >
                  🛍️ TechStar
                </div>
                <div
                  style={{
                    marginTop: "4px",
                    fontSize: "13px",
                    color: "#475569",
                  }}
                >
                  Order Invoice &amp; Shipping Label
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#64748b",
                  }}
                >
                  Order No.
                </div>
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: 800,
                    letterSpacing: "0.5px",
                  }}
                >
                  #{order._id.slice(-8).toUpperCase()}
                </div>
                <div
                  style={{
                    marginTop: "6px",
                    fontSize: "13px",
                    color: "#64748b",
                  }}
                >
                  {order.createdAt
                    ? new Date(order.createdAt).toLocaleString()
                    : "Date unavailable"}
                </div>
              </div>
            </div>

            {/* Ship To -- large & prominent so this section can be
                cut out / read at a glance when stuck on the parcel */}
            <div
              style={{
                border: "2px solid #0f172a",
                borderRadius: "10px",
                padding: "18px 20px",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 800,
                  letterSpacing: "1px",
                  color: "#64748b",
                  marginBottom: "8px",
                }}
              >
                📦 SHIP TO
              </div>

              <div
                style={{
                  fontSize: "22px",
                  fontWeight: 800,
                  marginBottom: "6px",
                }}
              >
                {order.deliveryAddress?.fullName ||
                  order.customerName}
              </div>

              <div
                style={{
                  fontSize: "16px",
                  lineHeight: 1.5,
                  marginBottom: "6px",
                }}
              >
                {order.deliveryAddress?.address}
                {order.deliveryAddress?.area
                  ? `, ${order.deliveryAddress.area}`
                  : ""}
                {order.deliveryAddress?.city
                  ? `, ${order.deliveryAddress.city}`
                  : ""}
              </div>

              <div
                style={{
                  fontSize: "16px",
                  fontWeight: 700,
                }}
              >
                📱{" "}
                {order.deliveryAddress?.phone ||
                  order.customerPhone}
              </div>
            </div>

            {/* Order meta */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "12px",
                marginBottom: "24px",
                fontSize: "13px",
              }}
            >
              <div>
                <div style={{ color: "#64748b" }}>
                  Customer
                </div>
                <div style={{ fontWeight: 700 }}>
                  {order.customerName}
                </div>
              </div>

              <div>
                <div style={{ color: "#64748b" }}>
                  Email
                </div>
                <div style={{ fontWeight: 700 }}>
                  {order.customerEmail || "—"}
                </div>
              </div>

              <div>
                <div style={{ color: "#64748b" }}>
                  Order Status
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    textTransform: "capitalize",
                  }}
                >
                  {order.status}
                </div>
              </div>

              <div>
                <div style={{ color: "#64748b" }}>
                  Payment
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    textTransform: "capitalize",
                  }}
                >
                  {order.paymentMethod} ·{" "}
                  {order.paymentStatus}
                </div>
              </div>
            </div>

            {/* Items table */}
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "14px",
                marginBottom: "20px",
              }}
            >
              <thead>
                <tr style={{ background: "#0f172a", color: "#fff" }}>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                    }}
                  >
                    #
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                    }}
                  >
                    Product
                  </th>
                  <th
                    style={{
                      textAlign: "center",
                      padding: "10px 12px",
                    }}
                  >
                    Qty
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "10px 12px",
                    }}
                  >
                    Unit Price
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "10px 12px",
                    }}
                  >
                    Subtotal
                  </th>
                </tr>
              </thead>

              <tbody>
                {order.items.map((item, index) => (
                  <tr
                    key={`${item.productId}-${index}`}
                    style={{
                      borderBottom: "1px solid #e2e8f0",
                      background:
                        index % 2 === 0 ? "#ffffff" : "#f8fafc",
                    }}
                  >
                    <td style={{ padding: "10px 12px" }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      {item.name}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        textAlign: "center",
                      }}
                    >
                      {item.quantity}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        textAlign: "right",
                      }}
                    >
                      {order.currency} {item.price}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        textAlign: "right",
                        fontWeight: 700,
                      }}
                    >
                      {order.currency}{" "}
                      {item.price * item.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Total */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: "28px",
              }}
            >
              <div
                style={{
                  minWidth: "240px",
                  border: "2px solid #0f172a",
                  borderRadius: "10px",
                  padding: "14px 18px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontWeight: 700 }}>
                  Total Amount
                </span>
                <span
                  style={{
                    fontSize: "22px",
                    fontWeight: 900,
                  }}
                >
                  {order.currency} {order.totalAmount}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                borderTop: "1px solid #e2e8f0",
                paddingTop: "16px",
                fontSize: "12px",
                color: "#64748b",
                textAlign: "center",
              }}
            >
              Thank you for shopping with TechStar. For any
              questions about this order, please contact our
              support team with the Order No. shown above.
            </div>
          </div>
        )}
      </main>
    </>
  );
}
