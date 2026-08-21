
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
  const [uploadingImage, setUploadingImage] = useState(false);

  function updateField(
    field: string,
    value: string | boolean
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function compressProductImage(
    file: File
  ): Promise<File> {
    const MAX_SIZE = 145 * 1024;

    const imageUrl = URL.createObjectURL(file);

    try {
      const image = await new Promise<HTMLImageElement>(
        (resolve, reject) => {
          const img = new Image();

          img.onload = () => resolve(img);
          img.onerror = () =>
            reject(new Error("Unable to read image."));

          img.src = imageUrl;
        }
      );

      const squareSize = Math.min(
        image.naturalWidth,
        image.naturalHeight
      );

      const sourceX =
        (image.naturalWidth - squareSize) / 2;

      const sourceY =
        (image.naturalHeight - squareSize) / 2;

      const maxDimension = 1200;

      const outputSize = Math.min(
        squareSize,
        maxDimension
      );

      const canvas = document.createElement("canvas");

      canvas.width = outputSize;
      canvas.height = outputSize;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error(
          "Your browser does not support image compression."
        );
      }

      context.clearRect(0, 0, outputSize, outputSize);

      context.drawImage(
        image,
        sourceX,
        sourceY,
        squareSize,
        squareSize,
        0,
        0,
        outputSize,
        outputSize
      );

      let quality = 0.88;

      for (let attempt = 0; attempt < 10; attempt++) {
        const blob = await new Promise<Blob | null>(
          (resolve) =>
            canvas.toBlob(
              resolve,
              "image/jpeg",
              quality
            )
        );

        if (!blob) {
          throw new Error("Unable to compress image.");
        }

        if (blob.size <= MAX_SIZE) {
          return new File([blob], "product-image.jpg", {
            type: "image/jpeg",
          });
        }

        quality -= 0.07;

        if (quality < 0.35) {
          break;
        }
      }

      const finalBlob = await new Promise<Blob | null>(
        (resolve) =>
          canvas.toBlob(resolve, "image/jpeg", 0.3)
      );

      if (!finalBlob) {
        throw new Error("Unable to compress image.");
      }

      return new File([finalBlob], "product-image.jpg", {
        type: "image/jpeg",
      });
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  }

  async function handleProductImageUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be smaller than 10 MB.");
      event.target.value = "";
      return;
    }

    try {
      setUploadingImage(true);
      setError("");
      setMessage("Preparing image...");

      const compressedFile = await compressProductImage(
        file
      );

      const cloudName =
        process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

      const uploadPreset =
        process.env
          .NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ||
        "techstar_profiles";

      if (!cloudName) {
        throw new Error(
          "Cloudinary cloud name is missing."
        );
      }

      const formData = new FormData();

      formData.append("file", compressedFile);
      formData.append("upload_preset", uploadPreset);

      setMessage("Uploading image...");

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok) {
        throw new Error(
          uploadData.error?.message ||
            "Cloudinary upload failed."
        );
      }

      const uploadedUrl = uploadData.secure_url;

      const backgroundRemovedUrl = uploadedUrl.replace(
        "/upload/",
        "/upload/e_background_removal/"
      );

      updateField("image", backgroundRemovedUrl);

      setMessage("Image uploaded successfully.");
    } catch (err) {
      setMessage("");

      setError(
        err instanceof Error
          ? err.message
          : "Unable to upload image."
      );
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
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
            Product Image
          </label>

          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
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
              style={{ ...inputStyle, flex: 1 }}
            />

            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "13px 18px",
                borderRadius: "10px",
                background: uploadingImage
                  ? "#1e3a8a"
                  : "#2563eb",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "14px",
                cursor: uploadingImage
                  ? "not-allowed"
                  : "pointer",
                whiteSpace: "nowrap",
                opacity: uploadingImage ? 0.7 : 1,
              }}
            >
              {uploadingImage
                ? "Uploading..."
                : "📷 Upload Picture"}

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleProductImageUpload}
                disabled={uploadingImage}
                style={{ display: "none" }}
              />
            </label>
          </div>

          <p
            style={{
              marginTop: "6px",
              fontSize: "12px",
              color: "#94a3b8",
            }}
          >
            Uploaded pictures are automatically background-removed,
            cropped to 1:1, and compressed under 150 KB.
          </p>

          {form.image && (
            <div
              style={{
                marginTop: "12px",
                width: "120px",
                height: "120px",
                borderRadius: "12px",
                overflow: "hidden",
                border: "1px solid #334155",
                background: "#000000",
              }}
            >
              <img
                src={form.image}
                alt="Product preview"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>
          )}

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
