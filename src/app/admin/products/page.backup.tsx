"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Product = {
  _id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  price: number;
  currency: string;
  image?: string;
  stock: number;
  featured: boolean;
  active: boolean;
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadProducts() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/products", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to load products."
        );
      }

      setProducts(
        Array.isArray(data.products)
          ? data.products
          : []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load products."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "white",
        padding: "25px 16px",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
            marginBottom: "25px",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "32px",
              }}
            >
              📦 Products
            </h1>

            <p style={{ color: "#94a3b8" }}>
              TechStar product management
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <Link
              href="/admin/products/add"
              style={{
                background: "#2563eb",
                color: "white",
                padding: "10px 14px",
                borderRadius: "8px",
                textDecoration: "none",
              }}
            >
              ➕ Add Product
            </Link>

            <Link
              href="/admin"
              style={{
                background: "#1e293b",
                color: "white",
                padding: "10px 14px",
                borderRadius: "8px",
                textDecoration: "none",
              }}
            >
              ← Admin
            </Link>
          </div>
        </div>

        {message && (
          <p
            style={{
              background: "#14532d",
              padding: "12px",
              borderRadius: "8px",
            }}
          >
            {message}
          </p>
        )}

        {error && (
          <p
            style={{
              background: "#7f1d1d",
              padding: "12px",
              borderRadius: "8px",
            }}
          >
            {error}
          </p>
        )}

        {loading && (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
            }}
          >
            Loading products...
          </div>
        )}

        {!loading && products.length === 0 && (
          <div
            style={{
              background: "#0f172a",
              padding: "40px 20px",
              borderRadius: "15px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "50px" }}>
              📦
            </div>

            <h2>No Products Found</h2>

            <p style={{ color: "#94a3b8" }}>
              There are currently no products
              in the database.
            </p>
          </div>
        )}

        {!loading && products.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "20px",
            }}
          >
            {products.map((product) => (
              <div
                key={product._id}
                style={{
                  background: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: "15px",
                  overflow: "hidden",
                }}
              >
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    style={{
                      width: "100%",
                      height: "180px",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      height: "180px",
                      background: "#1e293b",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "50px",
                    }}
                  >
                    📦
                  </div>
                )}

                <div style={{ padding: "18px" }}>
                  <h2 style={{ marginTop: 0 }}>
                    {product.name}
                  </h2>

                  <p
                    style={{
                      color: "#60a5fa",
                    }}
                  >
                    {product.category}
                  </p>

                  <p
                    style={{
                      color: "#94a3b8",
                    }}
                  >
                    {product.description}
                  </p>

                  <strong>
                    {product.currency} {product.price}
                  </strong>

                  <p>
                    Stock: {product.stock}
                  </p>

                  <button
                    onClick={loadProducts}
                    style={{
                      background: "#1e293b",
                      color: "white",
                      border: "1px solid #334155",
                      padding: "10px",
                      borderRadius: "8px",
                    }}
                  >
                    🔄 Refresh
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
