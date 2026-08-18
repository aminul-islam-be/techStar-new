
"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AddProductPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    slug: "",
    category: "",
    description: "",
    price: "",
    currency: "BDT",
    image: "",
    stock: "",
    featured: false,
    active: true,
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function updateField(
    field: string,
    value: string | boolean
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function makeSlug(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          category: form.category,
          description: form.description,
          price: Number(form.price),
          currency: form.currency,
          image: form.image,
          stock: Number(form.stock),
          featured: form.featured,
          active: form.active,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to add product."
        );
      }

      setMessage("Product added successfully.");

      setTimeout(() => {
        router.push("/admin/products");
        router.refresh();
      }, 800);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to add product."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#ffffff",
        padding: "25px 16px 60px",
      }}
    >
      <div
        style={{
          maxWidth: "850px",
          margin: "0 auto",
        }}
      >
        {/* Header */}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "15px",
            flexWrap: "wrap",
            marginBottom: "30px",
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
              ➕ Add Product
            </h1>

            <p
              style={{
                color: "#94a3b8",
                marginTop: "8px",
              }}
            >
              Add a new product to TechStar
            </p>
          </div>

          <Link
            href="/admin/products"
            style={{
              padding: "11px 18px",
              background: "#1e293b",
              color: "#ffffff",
              borderRadius: "10px",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            ← Products
          </Link>
        </div>

        {/* Success */}

        {message && (
          <div
            style={{
              background: "#052e16",
              border: "1px solid #166534",
              color: "#bbf7d0",
              padding: "15px",
              borderRadius: "12px",
              marginBottom: "20px",
            }}
          >
            {message}
          </div>
        )}

        {/* Error */}

        {error && (
          <div
            style={{
              background: "#450a0a",
              border: "1px solid #7f1d1d",
              color: "#fecaca",
              padding: "15px",
              borderRadius: "12px",
              marginBottom: "20px",
            }}
          >
            {error}
          </div>
        )}

        {/* Form */}

        <form
          onSubmit={handleSubmit}
          style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: "18px",
            padding: "25px",
          }}
        >
          {/* Name */}

          <label style={labelStyle}>
            Product Name *
          </label>

          <input
            value={form.name}
            onChange={(event) => {
              const name = event.target.value;

              setForm((current) => ({
                ...current,
                name,
                slug: makeSlug(name),
              }));
            }}
            placeholder="Example: ESP32 Development Board"
            required
            style={inputStyle}
          />

          {/* Slug */}

          <label style={labelStyle}>
            Slug *
          </label>

          <input
            value={form.slug}
            onChange={(event) =>
              updateField(
                "slug",
                makeSlug(event.target.value)
              )
            }
            placeholder="esp32-development-board"
            required
            style={inputStyle}
          />

          {/* Category */}

          <label style={labelStyle}>
            Category *
          </label>

          <input
            value={form.category}
            onChange={(event) =>
              updateField(
                "category",
                event.target.value
              )
            }
            placeholder="Arduino, ESP32, Sensor..."
            required
            style={inputStyle}
          />

          {/* Description */}

          <label style={labelStyle}>
            Description
          </label>

          <textarea
            value={form.description}
            onChange={(event) =>
              updateField(
                "description",
                event.target.value
              )
            }
            placeholder="Write product description..."
            rows={5}
            style={{
              ...inputStyle,
              resize: "vertical",
            }}
          />

          {/* Price + Currency */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(0, 2fr) minmax(0, 1fr)",
              gap: "15px",
            }}
          >
            <div>
              <label style={labelStyle}>
                Price *
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(event) =>
                  updateField(
                    "price",
                    event.target.value
                  )
                }
                placeholder="1500"
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Currency
              </label>

              <select
                value={form.currency}
                onChange={(event) =>
                  updateField(
                    "currency",
                    event.target.value
                  )
                }
                style={inputStyle}
              >
                <option value="BDT">
                  BDT
                </option>

                <option value="USD">
                  USD
                </option>

                <option value="EUR">
                  EUR
                </option>
              </select>
            </div>
          </div>

          {/* Stock */}

          <label style={labelStyle}>
            Stock *
          </label>

          <input
            type="number"
            min="0"
            step="1"
            value={form.stock}
            onChange={(event) =>
              updateField(
                "stock",
                event.target.value
              )
            }
            placeholder="10"
            required
            style={inputStyle}
          />

          {/* Image */}

          <label style={labelStyle}>
            Product Image URL
          </label>

          <input
            type="url"
            value={form.image}
            onChange={(event) =>
              updateField(
                "image",
                event.target.value
              )
            }
            placeholder="https://example.com/product.jpg"
            style={inputStyle}
          />

          {/* Options */}

          <div
            style={{
              marginTop: "10px",
              display: "grid",
              gap: "14px",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                color: "#e2e8f0",
              }}
            >
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(event) =>
                  updateField(
                    "featured",
                    event.target.checked
                  )
                }
              />

              Featured Product
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                color: "#e2e8f0",
              }}
            >
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) =>
                  updateField(
                    "active",
                    event.target.checked
                  )
                }
              />

              Active Product
            </label>
          </div>

          {/* Submit */}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              marginTop: "30px",
              padding: "15px",
              border: "none",
              borderRadius: "12px",
              background: loading
                ? "#475569"
                : "#2563eb",
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: 800,
              cursor: loading
                ? "not-allowed"
                : "pointer",
            }}
          >
            {loading
              ? "Adding Product..."
              : "➕ Add Product"}
          </button>
        </form>
      </div>
    </main>
  );
}

const labelStyle = {
  display: "block",
  marginBottom: "8px",
  marginTop: "20px",
  color: "#e2e8f0",
  fontWeight: 700,
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "13px 14px",
  borderRadius: "10px",
  border: "1px solid #334155",
  background: "#020617",
  color: "#ffffff",
  outline: "none",
  fontSize: "15px",
};
