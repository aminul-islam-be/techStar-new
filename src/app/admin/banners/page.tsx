"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Banner = {
  _id: string;
  title?: string;
  type: "image" | "video";
  mediaUrl: string;
  linkUrl?: string;
  order: number;
  active: boolean;
};

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadBanners() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/admin/banners",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to load banners."
        );
      }

      setBanners(
        Array.isArray(data.banners) ? data.banners : []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load banners."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBanners();
  }, []);

  async function toggleActive(banner: Banner) {
    try {
      setError("");
      setMessage("");

      const response = await fetch(
        "/api/admin/banners",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: banner._id,
            active: !banner.active,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to update banner."
        );
      }

      setMessage("Banner updated successfully.");
      await loadBanners();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update banner."
      );
    }
  }

  async function updateOrder(
    banner: Banner,
    newOrder: string
  ) {
    try {
      setError("");

      const response = await fetch(
        "/api/admin/banners",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: banner._id,
            order: Number(newOrder) || 0,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to update order."
        );
      }

      await loadBanners();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update order."
      );
    }
  }

  async function deleteBanner(id: string) {
    if (
      !window.confirm(
        "Are you sure you want to delete this banner?"
      )
    ) {
      return;
    }

    try {
      setError("");
      setMessage("");

      const response = await fetch(
        `/api/admin/banners?id=${id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to delete banner."
        );
      }

      setMessage("Banner deleted successfully.");
      await loadBanners();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete banner."
      );
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
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        <div
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
            <Link
              href="/admin"
              style={{
                color: "#94a3b8",
                fontSize: "13px",
                textDecoration: "none",
              }}
            >
              ← Back to Dashboard
            </Link>

            <h1
              style={{
                margin: "8px 0 0",
                fontSize: "26px",
                fontWeight: 800,
              }}
            >
              Homepage Banners
            </h1>

            <p
              style={{
                margin: "6px 0 0",
                color: "#94a3b8",
                fontSize: "13px",
              }}
            >
              These banners appear in a slideshow above the
              category section on the homepage (16:9 ratio).
            </p>
          </div>

          <Link
            href="/admin/banners/add"
            style={{
              display: "inline-block",
              padding: "12px 20px",
              borderRadius: "10px",
              background: "#2563eb",
              color: "#ffffff",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: "14px",
            }}
          >
            + Add Banner
          </Link>
        </div>

        {message && (
          <div
            style={{
              marginBottom: "18px",
              padding: "12px 16px",
              borderRadius: "10px",
              background: "rgba(16,185,129,0.1)",
              border: "1px solid rgba(16,185,129,0.2)",
              color: "#6ee7b7",
              fontSize: "14px",
            }}
          >
            ✓ {message}
          </div>
        )}

        {error && (
          <div
            style={{
              marginBottom: "18px",
              padding: "12px 16px",
              borderRadius: "10px",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.2)",
              color: "#fca5a5",
              fontSize: "14px",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <p style={{ color: "#94a3b8" }}>
            Loading banners...
          </p>
        ) : banners.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              border: "1px dashed #334155",
              borderRadius: "18px",
              color: "#94a3b8",
            }}
          >
            No banners added yet. Click &quot;+ Add
            Banner&quot; to create one.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "16px",
            }}
          >
            {banners.map((banner) => (
              <div
                key={banner._id}
                style={{
                  display: "flex",
                  gap: "16px",
                  alignItems: "center",
                  flexWrap: "wrap",
                  background: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: "16px",
                  padding: "16px",
                }}
              >
                <div
                  style={{
                    width: "160px",
                    aspectRatio: "16/9",
                    borderRadius: "10px",
                    overflow: "hidden",
                    background: "#000000",
                    flexShrink: 0,
                  }}
                >
                  {banner.type === "video" ? (
                    <video
                      src={banner.mediaUrl}
                      muted
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <img
                      src={banner.mediaUrl}
                      alt={banner.title || "Banner"}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: "200px" }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "15px",
                    }}
                  >
                    {banner.title || "(No title)"}
                  </div>

                  <div
                    style={{
                      marginTop: "4px",
                      fontSize: "12px",
                      color: "#94a3b8",
                    }}
                  >
                    Type: {banner.type} &middot; Order:{" "}
                    {banner.order}
                  </div>

                  {banner.linkUrl && (
                    <div
                      style={{
                        marginTop: "4px",
                        fontSize: "12px",
                        color: "#60a5fa",
                        wordBreak: "break-all",
                      }}
                    >
                      Links to: {banner.linkUrl}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    alignItems: "flex-end",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "12px",
                        color: "#94a3b8",
                      }}
                    >
                      Order:
                    </span>

                    <input
                      type="number"
                      defaultValue={banner.order}
                      onBlur={(event) =>
                        updateOrder(
                          banner,
                          event.target.value
                        )
                      }
                      style={{
                        width: "60px",
                        padding: "6px 8px",
                        borderRadius: "8px",
                        border: "1px solid #334155",
                        background: "#020617",
                        color: "#ffffff",
                        fontSize: "13px",
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => toggleActive(banner)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: "8px",
                        border: "none",
                        fontWeight: 700,
                        fontSize: "12px",
                        cursor: "pointer",
                        background: banner.active
                          ? "rgba(16,185,129,0.15)"
                          : "rgba(148,163,184,0.15)",
                        color: banner.active
                          ? "#6ee7b7"
                          : "#94a3b8",
                      }}
                    >
                      {banner.active
                        ? "Active"
                        : "Inactive"}
                    </button>

                    <button
                      onClick={() =>
                        deleteBanner(banner._id)
                      }
                      style={{
                        padding: "8px 14px",
                        borderRadius: "8px",
                        border: "none",
                        fontWeight: 700,
                        fontSize: "12px",
                        cursor: "pointer",
                        background: "rgba(239,68,68,0.12)",
                        color: "#fca5a5",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
