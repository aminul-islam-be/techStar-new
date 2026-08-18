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
  const [editing, setEditing] = useState<Product | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editStock, setEditStock] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");

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

  async function updateProduct(
    id: string,
    changes: Partial<Product>
  ) {
    try {
      setError("");
      setMessage("");

      const response = await fetch("/api/products", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          ...changes,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to update product."
        );
      }

      setMessage("Product updated successfully.");
      await loadProducts();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update product."
      );
    }
  }
  function startEdit(product: Product) {
    setEditing(product);
    setEditName(product.name);
    setEditPrice(String(product.price));
    setEditStock(String(product.stock));
    setEditCategory(product.category);
    setEditDescription(product.description);
    setError("");
    setMessage("");
  }

  async function saveEdit() {
    if (!editing) return;

    const price = Number(editPrice);
    const stock = Number(editStock);

    if (!editName.trim() || !editCategory.trim()) {
      setError("Name and category are required.");
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      setError("Please enter a valid price.");
      return;
    }

    if (!Number.isFinite(stock) || stock < 0) {
      setError("Please enter a valid stock.");
      return;
    }

    await updateProduct(editing._id, {
      name: editName.trim(),
      category: editCategory.trim(),
      description: editDescription.trim(),
      price,
      stock,
    });

    setEditing(null);
  }

  async function changeStock(product: Product) {
    const value = window.prompt(
      "Enter new stock:",
      String(product.stock)
    );

    if (value === null) return;

    const stock = Number(value);

    if (!Number.isFinite(stock) || stock < 0) {
      setError("Please enter a valid stock number.");
      return;
    }

    await updateProduct(product._id, { stock });
  }

  async function deleteProduct(product: Product) {
    const confirmed = window.confirm(
      `Delete "${product.name}"?`
    );

    if (!confirmed) return;

    try {
      setError("");
      setMessage("");

      const response = await fetch(
        `/api/products?id=${encodeURIComponent(product._id)}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to delete product."
        );
      }

      setMessage("Product deleted successfully.");
      await loadProducts();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete product."
      );
    }
  }

  async function toggleActive(product: Product) {
    await updateProduct(product._id, {
      active: !product.active,
    });
  }

  async function toggleFeatured(product: Product) {
    await updateProduct(product._id, {
      featured: !product.featured,
    });
  }
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "white",
        padding: "25px 16px 50px",
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
            gap: "12px",
            marginBottom: "25px",
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: "32px" }}>
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
                fontWeight: 700,
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
                fontWeight: 700,
              }}
            >
              ← Admin
            </Link>
          </div>
        </div>

        {message && (
          <div
            style={{
              background: "#14532d",
              padding: "12px",
              borderRadius: "8px",
              marginBottom: "15px",
            }}
          >
            {message}
          </div>
        )}

        {error && (
          <div
            style={{
              background: "#7f1d1d",
              padding: "12px",
              borderRadius: "8px",
              marginBottom: "15px",
            }}
          >
            {error}
          </div>
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
            <div style={{ fontSize: "50px" }}>📦</div>

            <h2>No Products Found</h2>

            <p style={{ color: "#94a3b8" }}>
              There are currently no products in the database.
            </p>

            <Link
              href="/admin/products/add"
              style={{
                display: "inline-block",
                marginTop: "10px",
                background: "#2563eb",
                color: "white",
                padding: "10px 15px",
                borderRadius: "8px",
                textDecoration: "none",
              }}
            >
              ➕ Add Product
            </Link>
          </div>
        )}
        {editing && (
          <div
            style={{
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "15px",
              padding: "20px",
              marginBottom: "25px",
            }}
          >
            <h2 style={{ marginTop: 0 }}>
              ✏️ Edit Product
            </h2>

            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Product Name"
              style={inputStyle}
            />

            <input
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
              placeholder="Category"
              style={inputStyle}
            />

            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Description"
              rows={4}
              style={inputStyle}
            />

            <input
              type="number"
              value={editPrice}
              onChange={(e) => setEditPrice(e.target.value)}
              placeholder="Price"
              style={inputStyle}
            />

            <input
              type="number"
              value={editStock}
              onChange={(e) => setEditStock(e.target.value)}
              placeholder="Stock"
              style={inputStyle}
            />

            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={saveEdit}
                style={{
                  ...buttonStyle,
                  background: "#2563eb",
                }}
              >
                💾 Save Changes
              </button>

              <button
                onClick={() => setEditing(null)}
                style={buttonStyle}
              >
                Cancel
              </button>
            </div>
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
                  ...cardStyle,
                  overflow: "hidden",
                  transition: "transform 0.2s ease",
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
                      background:
                        "linear-gradient(135deg, #1e293b, #020617)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "55px",
                    }}
                  >
                    📦
                  </div>
                )}

                <div style={{ padding: "18px" }}>
                  <h2 style={{ marginTop: 0 }}>
                    {product.name}
                  </h2>

                  <p style={{ color: "#60a5fa" }}>
                    {product.category}
                  </p>

                  <p style={{ color: "#94a3b8" }}>
                    {product.description}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "10px",
                      margin: "15px 0",
                    }}
                  >
                    <strong
                      style={{
                        fontSize: "20px",
                        color: "#60a5fa",
                      }}
                    >
                      {product.currency} {product.price}
                    </strong>

                    <span
                      style={{
                        ...badgeStyle,
                        background:
                          product.stock > 0
                            ? "#14532d"
                            : "#7f1d1d",
                        color: "#fff",
                      }}
                    >
                      📦 {product.stock} in stock
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      flexWrap: "wrap",
                      marginBottom: "15px",
                    }}
                  >
                    <span
                      style={{
                        ...badgeStyle,
                        background: product.active
                          ? "#14532d"
                          : "#7f1d1d",
                        color: "#fff",
                      }}
                    >
                      {product.active
                        ? "● Active"
                        : "● Inactive"}
                    </span>

                    {product.featured && (
                      <span
                        style={{
                          ...badgeStyle,
                          background: "#713f12",
                          color: "#fde68a",
                        }}
                      >
                        ⭐ Featured
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "8px",
                      marginTop: "15px",
                    }}
                  >
                    <button
                      onClick={() => startEdit(product)}
                      style={buttonStyle}
                    >
                      ✏️ Edit
                    </button>

                    <button
                      onClick={() => changeStock(product)}
                      style={buttonStyle}
                    >
                      📦 Stock
                    </button>

                    <button
                      onClick={() => deleteProduct(product)}
                      style={{
                        ...buttonStyle,
                        background: "#7f1d1d",
                      }}
                    >
                      🗑️ Delete
                    </button>

                    <button
                      onClick={() => toggleActive(product)}
                      style={buttonStyle}
                    >
                      {product.active
                        ? "⏸ Disable"
                        : "▶️ Activate"}
                    </button>

                    <button
                      onClick={() => toggleFeatured(product)}
                      style={buttonStyle}
                    >
                      {product.featured
                        ? "★ Unfeature"
                        : "☆ Feature"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && (
          <div
            style={{
              textAlign: "center",
              marginTop: "25px",
            }}
          >
            <button
              onClick={loadProducts}
              style={buttonStyle}
            >
              🔄 Refresh Products
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

const cardStyle = {
  background: "linear-gradient(145deg, #0f172a, #111827)",
  border: "1px solid #1e293b",
  borderRadius: "18px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
};

const badgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "5px 9px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 700,
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  background: "#020617",
  color: "white",
  border: "1px solid #334155",
  padding: "12px",
  borderRadius: "8px",
  marginBottom: "12px",
  fontSize: "15px",
};

const buttonStyle = {
  background: "#1e293b",
  color: "white",
  border: "1px solid #334155",
  padding: "10px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};

