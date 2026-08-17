```tsx
"use client";

import { FormEvent, useEffect, useState } from "react";
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

type ProductForm = {
  name: string;
  slug: string;
  category: string;
  description: string;
  price: string;
  currency: string;
  image: string;
  stock: string;
  featured: boolean;
  active: boolean;
};

const emptyForm: ProductForm = {
  name: "",
  slug: "",
  category: "",
  description: "",
  price: "",
  currency: "BDT",
  image: "",
  stock: "0",
  featured: false,
  active: true,
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function loadProducts() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/products?admin=true", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load products.");
      }

      setProducts(Array.isArray(data.products) ? data.products : []);
    } catch (err) {
      console.error(err);
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

  function updateForm(
    field: keyof ProductForm,
    value: string | boolean
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function startAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage("");
    setError("");
    setShowForm(true);
  }

  function startEdit(product: Product) {
    setEditingId(product._id);

    setForm({
      name: product.name || "",
      slug: product.slug || "",
      category: product.category || "",
      description: product.description || "",
      price: String(product.price ?? ""),
      currency: product.currency || "BDT",
      image: product.image || "",
      stock: String(product.stock ?? 0),
      featured: Boolean(product.featured),
      active: Boolean(product.active),
    });

    setMessage("");
    setError("");
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelForm() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(false);
    setError("");
    setMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      if (!form.name.trim()) {
        throw new Error("Product name is required.");
      }

      if (!form.category.trim()) {
        throw new Error("Product category is required.");
      }

      if (form.price === "" || Number(form.price) < 0) {
        throw new Error("Enter a valid product price.");
      }

      if (form.stock === "" || Number(form.stock) < 0) {
        throw new Error("Enter a valid stock quantity.");
      }

      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        category: form.category.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        currency: form.currency.trim().toUpperCase() || "BDT",
        image: form.image.trim(),
        stock: Number(form.stock),
        featured: form.featured,
        active: form.active,
      };

      const response = await fetch("/api/products", {
        method: editingId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          editingId
            ? {
                id: editingId,
                ...payload,
              }
            : payload
        ),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            (editingId
              ? "Unable to update product."
              : "Unable to create product.")
        );
      }

      setMessage(
        editingId
          ? "Product updated successfully."
          : "Product added successfully."
      );

      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);

      await loadProducts();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this product?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setMessage("");

      const response = await fetch(
        `/api/products?id=${encodeURIComponent(id)}`,
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
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete product."
      );
    }
  }

  async function toggleActive(product: Product) {
    try {
      setError("");
      setMessage("");

      const response = await fetch("/api/products", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: product._id,
          active: !product.active,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to change product status."
        );
      }

      setMessage(
        product.active
          ? "Product deactivated."
          : "Product activated."
      );

      await loadProducts();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to change product status."
      );
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#ffffff",
        padding: "25px 16px 50px",
      }}
    >
      <div
        style={{
          maxWidth: "1150px",
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
                fontSize: "32px",
                fontWeight: 800,
                margin: 0,
              }}
            >
              📦 Products
            </h1>

            <p
              style={{
                color: "#94a3b8",
                margin: "8px 0 0",
              }}
            >
              Manage TechStar products
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/admin"
              style={{
                padding: "11px 16px",
                background: "#1e293b",
                color: "#ffffff",
                borderRadius: "10px",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              ← Dashboard
            </Link>

            <button
              type="button"
              onClick={startAdd}
              style={{
                padding: "11px 16px",
                background: "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              + Add Product
            </button>
          </div>
        </header>

        {message && (
          <div
            style={{
              background: "#052e16",
              color: "#bbf7d0",
              border: "1px solid #166534",
              padding: "14px 16px",
              borderRadius: "12px",
              marginBottom: "20px",
            }}
          >
            {message}
          </div>
        )}

        {error && (
          <div
            style={{
              background: "#450a0a",
              color: "#fecaca",
              border: "1px solid #991b1b",
              padding: "14px 16px",
              borderRadius: "12px",
              marginBottom: "20px",
            }}
          >
            {error}
          </div>
        )}

        {showForm && (
          <section
            style={{
              background: "#0f172a",
              border: "1px solid #1e293b",
              borderRadius: "18px",
              padding: "22px",
              marginBottom: "25px",
            }}
          >
            <h2
              style={{
                marginTop: 0,
                marginBottom: "20px",
                fontSize: "24px",
              }}
            >
              {editingId
                ? "✏️ Edit Product"
                : "➕ Add New Product"}
            </h2>

            <form onSubmit={handleSubmit}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "16px",
                }}
              >
                <label>
                  <span>Product Name *</span>
                  <input
                    value={form.name}
                    onChange={(e) =>
                      updateForm("name", e.target.value)
                    }
                    placeholder="Example: ESP32 Development Board"
                    style={inputStyle}
                  />
                </label>

                <label>
                  <span>Slug</span>
                  <input
                    value={form.slug}
                    onChange={(e) =>
                      updateForm("slug", e.target.value)
                    }
                    placeholder="esp32-development-board"
                    style={inputStyle}
                  />
                </label>

                <label>
                  <span>Category *</span>
                  <input
                    value={form.category}
                    onChange={(e) =>
                      updateForm("category", e.target.value)
                    }
                    placeholder="Microcontroller"
                    style={inputStyle}
                  />
                </label>

                <label>
                  <span>Price *</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) =>
                      updateForm("price", e.target.value)
                    }
                    placeholder="500"
                    style={inputStyle}
                  />
                </label>

                <label>
                  <span>Currency</span>
                  <select
                    value={form.currency}
                    onChange={(e) =>
                      updateForm("currency", e.target.value)
                    }
                    style={inputStyle}
                  >
                    <option value="BDT">BDT</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </label>

                <label>
                  <span>Stock *</span>
                  <input
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={(e) =>
                      updateForm("stock", e.target.value)
                    }
                    placeholder="10"
                    style={inputStyle}
                  />
                </label>

                <label
                  style={{
                    gridColumn: "1 / -1",
                  }}
                >
                  <span>Image URL</span>
                  <input
                    value={form.image}
                    onChange={(e) =>
                      updateForm("image", e.target.value)
                    }
                    placeholder="https://example.com/product.jpg"
                    style={inputStyle}
                  />
                </label>

                <label
                  style={{
                    gridColumn: "1 / -1",
                  }}
                >
                  <span>Description</span>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      updateForm(
                        "description",
                        e.target.value
                      )
                    }
                    placeholder="Product description..."
                    rows={5}
                    style={{
                      ...inputStyle,
                      resize: "vertical",
                    }}
                  />
                </label>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "20px",
                  flexWrap: "wrap",
                  marginTop: "20px",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) =>
                      updateForm(
                        "featured",
                        e.target.checked
                      )
                    }
                  />
                  Featured Product
                </label>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) =>
                      updateForm(
                        "active",
                        e.target.checked
                      )
                    }
                  />
                  Active Product
                </label>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  marginTop: "25px",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: "12px 20px",
                    background: saving
                      ? "#475569"
                      : "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "10px",
                    fontWeight: 700,
                    cursor: saving
                      ? "not-allowed"
                      : "pointer",
                  }}
                >
                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Update Product"
                    : "Add Product"}
                </button>

                <button
                  type="button"
                  onClick={cancelForm}
                  style={{
                    padding: "12px 20px",
                    background: "#334155",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "10px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        <section>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "15px",
            }}
          >
            <h2
              style={{
                fontSize: "22px",
                margin: 0,
              }}
            >
              Product List
            </h2>

            <span
              style={{
                color: "#94a3b8",
              }}
            >
              {products.length} product
              {products.length !== 1 ? "s" : ""}
            </span>
          </div>

          {loading && (
            <div
              style={{
                background: "#0f172a",
                padding: "30px",
                borderRadius: "16px",
                border: "1px solid #1e293b",
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
                borderRadius: "18px",
                border: "1px solid #1e293b",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "42px",
                  marginBottom: "10px",
                }}
              >
                📦
              </div>

              <h3>No Products Found</h3>

              <p
                style={{
                  color: "#94a3b8",
                  marginBottom: "20px",
                }}
              >
                Add your first TechStar product.
              </p>

              <button
                type="button"
                onClick={startAdd}
                style={{
                  padding: "12px 20px",
                  background: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "10px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                + Add First Product
              </button>
            </div>
          )}

          {!loading && products.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(270px, 1fr))",
                gap: "18px",
              }}
            >
              {products.map((product) => (
                <article
                  key={product._id}
                  style={{
                    background: "#0f172a",
                    border: "1px solid #1e293b",
                    borderRadius: "18px",
                    overflow: "hidden",
                  }}
 
