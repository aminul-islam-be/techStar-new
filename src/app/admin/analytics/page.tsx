"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Totals = {
  totalRevenue: number;
  totalOrders: number;
  paidOrders: number;
  totalCustomers: number;
  totalProducts: number;
};

type StatusCount = { status: string; count: number };
type MonthlySale = { label: string; revenue: number; orders: number };
type BestSeller = { _id: string; name: string; image?: string; quantitySold: number; revenue: number };
type LowStockProduct = { _id: string; name: string; slug: string; stock: number; category: string };

const statusColors: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#38bdf8",
  processing: "#a78bfa",
  shipped: "#fb923c",
  delivered: "#22c55e",
  cancelled: "#ef4444",
};

function formatMoney(n: number) {
  return "৳" + n.toLocaleString("en-BD", { maximumFractionDigits: 0 });
}

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [totals, setTotals] = useState<Totals | null>(null);
  const [ordersByStatus, setOrdersByStatus] = useState<StatusCount[]>([]);
  const [monthlySales, setMonthlySales] = useState<MonthlySale[]>([]);
  const [bestSellers, setBestSellers] = useState<BestSeller[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");
        const response = await fetch("/api/admin/analytics");
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || "Unable to load analytics.");
        }
        setTotals(data.totals);
        setOrdersByStatus(data.ordersByStatus || []);
        setMonthlySales(data.monthlySales || []);
        setBestSellers(data.bestSellers || []);
        setLowStockProducts(data.lowStockProducts || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load analytics.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const maxMonthlyRevenue = Math.max(1, ...monthlySales.map((m) => m.revenue));
  const totalStatusCount = Math.max(1, ordersByStatus.reduce((sum, s) => sum + s.count, 0));

  return (
    <main style={{ minHeight: "100vh", background: "#020617", color: "#f8fafc", padding: "25px 16px 50px" }}>
      <div style={{ maxWidth: "1180px", margin: "0 auto" }}>
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
            <h1 style={{ margin: 0, fontSize: "32px", fontWeight: 800 }}>📊 Analytics</h1>
            <p style={{ margin: "6px 0 0", color: "#94a3b8" }}>TechStar business overview</p>
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
            ← Dashboard
          </Link>
        </header>

        {error && (
          <div
            style={{
              background: "#450a0a",
              border: "1px solid #7f1d1d",
              color: "#fecaca",
              padding: "12px 16px",
              borderRadius: "10px",
              marginBottom: "20px",
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <p style={{ color: "#94a3b8" }}>Loading analytics…</p>
        ) : (
          <>
            {/* Stat cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "16px",
                marginBottom: "25px",
              }}
            >
              {[
                { label: "Total Revenue (Paid)", value: formatMoney(totals?.totalRevenue || 0), icon: "💰" },
                { label: "Total Orders", value: String(totals?.totalOrders ?? 0), icon: "🛒" },
                { label: "Paid Orders", value: String(totals?.paidOrders ?? 0), icon: "✅" },
                { label: "Customers", value: String(totals?.totalCustomers ?? 0), icon: "👥" },
                { label: "Active Products", value: String(totals?.totalProducts ?? 0), icon: "📦" },
              ].map((card) => (
                <div
                  key={card.label}
                  style={{
                    background: "#0f172a",
                    border: "1px solid #1e293b",
                    borderRadius: "16px",
                    padding: "20px",
                  }}
                >
                  <div style={{ fontSize: "22px", marginBottom: "8px" }}>{card.icon}</div>
                  <div style={{ fontSize: "24px", fontWeight: 800 }}>{card.value}</div>
                  <div style={{ color: "#94a3b8", fontSize: "13px", marginTop: "4px" }}>{card.label}</div>
                </div>
              ))}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
                gap: "16px",
                marginBottom: "16px",
              }}
            >
              {/* Monthly sales trend */}
              <div
                style={{
                  background: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: "16px",
                  padding: "20px",
                  minWidth: 0,
                }}
              >
                <h2 style={{ margin: "0 0 18px", fontSize: "18px", fontWeight: 700 }}>
                  Monthly Sales (Last 6 Months)
                </h2>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    gap: "12px",
                    height: "180px",
                    paddingBottom: "8px",
                  }}
                >
                  {monthlySales.map((m) => (
                    <div
                      key={m.label}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        height: "100%",
                      }}
                      title={`${m.label}: ${formatMoney(m.revenue)} (${m.orders} orders)`}
                    >
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#94a3b8",
                          marginBottom: "6px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {m.revenue > 0 ? formatMoney(m.revenue) : ""}
                      </div>
                      <div
                        style={{
                          width: "100%",
                          maxWidth: "42px",
                          height: `${Math.max(4, (m.revenue / maxMonthlyRevenue) * 130)}px`,
                          background: "linear-gradient(180deg,#38bdf8,#0ea5e9)",
                          borderRadius: "6px 6px 0 0",
                        }}
                      />
                      <div style={{ fontSize: "12px", color: "#cbd5e1", marginTop: "8px" }}>{m.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Orders by status */}
              <div
                style={{
                  background: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: "16px",
                  padding: "20px",
                  minWidth: 0,
                }}
              >
                <h2 style={{ margin: "0 0 18px", fontSize: "18px", fontWeight: 700 }}>Orders by Status</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {ordersByStatus.map((s) => (
                    <div key={s.status}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "13px",
                          marginBottom: "4px",
                          textTransform: "capitalize",
                        }}
                      >
                        <span style={{ color: "#cbd5e1" }}>{s.status}</span>
                        <span style={{ color: "#94a3b8" }}>{s.count}</span>
                      </div>
                      <div style={{ background: "#1e293b", borderRadius: "6px", height: "8px", overflow: "hidden" }}>
                        <div
                          style={{
                            width: `${(s.count / totalStatusCount) * 100}%`,
                            height: "100%",
                            background: statusColors[s.status] || "#64748b",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                gap: "16px",
              }}
            >
              {/* Best sellers */}
              <div
                style={{
                  background: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: "16px",
                  padding: "20px",
                  minWidth: 0,
                }}
              >
                <h2 style={{ margin: "0 0 14px", fontSize: "18px", fontWeight: 700 }}>🏆 Best-Selling Products</h2>
                {bestSellers.length === 0 ? (
                  <p style={{ color: "#94a3b8", fontSize: "14px" }}>No sales data yet.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {bestSellers.map((p, i) => (
                      <div
                        key={p._id || i}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "10px 12px",
                          background: "#0b1220",
                          borderRadius: "10px",
                          border: "1px solid #1e293b",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                          <span style={{ color: "#64748b", fontWeight: 700, width: "18px" }}>{i + 1}</span>
                          <span
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              fontSize: "14px",
                            }}
                          >
                            {p.name}
                          </span>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: "13px", fontWeight: 700 }}>{p.quantitySold} sold</div>
                          <div style={{ fontSize: "12px", color: "#94a3b8" }}>{formatMoney(p.revenue)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Low stock */}
              <div
                style={{
                  background: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: "16px",
                  padding: "20px",
                  minWidth: 0,
                }}
              >
                <h2 style={{ margin: "0 0 14px", fontSize: "18px", fontWeight: 700 }}>⚠️ Low Stock Alert</h2>
                {lowStockProducts.length === 0 ? (
                  <p style={{ color: "#94a3b8", fontSize: "14px" }}>All products are well stocked.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {lowStockProducts.map((p) => (
                      <div
                        key={p._id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "10px 12px",
                          background: "#0b1220",
                          borderRadius: "10px",
                          border: "1px solid #1e293b",
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: "14px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {p.name}
                          </div>
                          <div style={{ fontSize: "12px", color: "#64748b" }}>{p.category}</div>
                        </div>
                        <span
                          style={{
                            flexShrink: 0,
                            padding: "4px 10px",
                            borderRadius: "999px",
                            fontSize: "12px",
                            fontWeight: 700,
                            background: p.stock === 0 ? "#450a0a" : "#451a03",
                            color: p.stock === 0 ? "#fecaca" : "#fed7aa",
                          }}
                        >
                          {p.stock === 0 ? "Out of stock" : `${p.stock} left`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
