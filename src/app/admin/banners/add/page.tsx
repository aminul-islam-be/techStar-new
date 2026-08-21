"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AddBannerPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [type, setType] = useState<"image" | "video">(
    "image"
  );
  const [mediaUrl, setMediaUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [order, setOrder] = useState("0");
  const [active, setActive] = useState(true);

  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function compressBannerImage(
    file: File
  ): Promise<File> {
    const MAX_SIZE = 400 * 1024;

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

      const targetRatio = 16 / 9;

      const currentRatio =
        image.naturalWidth / image.naturalHeight;

      let cropWidth = image.naturalWidth;
      let cropHeight = image.naturalHeight;

      if (currentRatio > targetRatio) {
        cropWidth = image.naturalHeight * targetRatio;
      } else {
        cropHeight = image.naturalWidth / targetRatio;
      }

      const sourceX =
        (image.naturalWidth - cropWidth) / 2;

      const sourceY =
        (image.naturalHeight - cropHeight) / 2;

      const maxOutputWidth = 1280;

      const outputWidth = Math.min(
        cropWidth,
        maxOutputWidth
      );

      const outputHeight = outputWidth / targetRatio;

      const canvas = document.createElement("canvas");

      canvas.width = outputWidth;
      canvas.height = outputHeight;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error(
          "Your browser does not support image compression."
        );
      }

      context.clearRect(
        0,
        0,
        outputWidth,
        outputHeight
      );

      context.drawImage(
        image,
        sourceX,
        sourceY,
        cropWidth,
        cropHeight,
        0,
        0,
        outputWidth,
        outputHeight
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
          throw new Error(
            "Unable to compress image."
          );
        }

        if (blob.size <= MAX_SIZE) {
          return new File([blob], "banner-image.jpg", {
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

      return new File([finalBlob], "banner-image.jpg", {
        type: "image/jpeg",
      });
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  }

  async function handleMediaUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    const cloudName =
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

    const uploadPreset =
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ||
      "techstar_profiles";

    if (!cloudName) {
      setError("Cloudinary cloud name is missing.");
      event.target.value = "";
      return;
    }

    try {
      setUploading(true);
      setError("");
      setMessage("");

      if (type === "image") {
        if (!file.type.startsWith("image/")) {
          throw new Error(
            "Please select an image file."
          );
        }

        if (file.size > 15 * 1024 * 1024) {
          throw new Error(
            "Image must be smaller than 15 MB."
          );
        }

        setMessage("Preparing image (16:9 crop)...");

        const compressedFile =
          await compressBannerImage(file);

        const formData = new FormData();

        formData.append("file", compressedFile);
        formData.append(
          "upload_preset",
          uploadPreset
        );

        setMessage("Uploading image...");

        const uploadResponse = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          {
            method: "POST",
            body: formData,
          }
        );

        const uploadData =
          await uploadResponse.json();

        if (!uploadResponse.ok) {
          throw new Error(
            uploadData.error?.message ||
              "Cloudinary upload failed."
          );
        }

        setMediaUrl(uploadData.secure_url);
        setMessage("Image uploaded successfully.");
      } else {
        if (!file.type.startsWith("video/")) {
          throw new Error(
            "Please select a video file."
          );
        }

        if (file.size > 60 * 1024 * 1024) {
          throw new Error(
            "Video must be smaller than 60 MB."
          );
        }

        const formData = new FormData();

        formData.append("file", file);
        formData.append(
          "upload_preset",
          uploadPreset
        );

        setMessage("Uploading video...");

        const uploadResponse = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
          {
            method: "POST",
            body: formData,
          }
        );

        const uploadData =
          await uploadResponse.json();

        if (!uploadResponse.ok) {
          throw new Error(
            uploadData.error?.message ||
              "Cloudinary upload failed."
          );
        }

        setMediaUrl(uploadData.secure_url);
        setMessage("Video uploaded successfully.");
      }
    } catch (err) {
      setMessage("");

      setError(
        err instanceof Error
          ? err.message
          : "Unable to upload media."
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!mediaUrl) {
      setError("Please upload a picture or video first.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      setError("");

      const response = await fetch(
        "/api/admin/banners",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title,
            type,
            mediaUrl,
            linkUrl,
            order: Number(order) || 0,
            active,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to add banner."
        );
      }

      setMessage("Banner added successfully.");

      setTimeout(() => {
        router.push("/admin/banners");
        router.refresh();
      }, 700);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to add banner."
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
          maxWidth: "700px",
          margin: "0 auto",
        }}
      >
        <Link
          href="/admin/banners"
          style={{
            color: "#94a3b8",
            fontSize: "13px",
            textDecoration: "none",
          }}
        >
          ← Back to Banners
        </Link>

        <h1
          style={{
            margin: "8px 0 25px",
            fontSize: "26px",
            fontWeight: 800,
          }}
        >
          Add Homepage Banner
        </h1>

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

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Title (optional)</label>

          <input
            value={title}
            onChange={(event) =>
              setTitle(event.target.value)
            }
            placeholder="e.g. Winter Sale"
            style={inputStyle}
          />

          <label style={labelStyle}>Banner Type</label>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={() => {
                setType("image");
                setMediaUrl("");
              }}
              style={{
                ...typeButtonStyle,
                background:
                  type === "image"
                    ? "#2563eb"
                    : "#0f172a",
              }}
            >
              🖼️ Picture
            </button>

            <button
              type="button"
              onClick={() => {
                setType("video");
                setMediaUrl("");
              }}
              style={{
                ...typeButtonStyle,
                background:
                  type === "video"
                    ? "#2563eb"
                    : "#0f172a",
              }}
            >
              🎬 Video
            </button>
          </div>

          <label style={labelStyle}>
            Upload {type === "image" ? "Picture" : "Video"}
          </label>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
              borderRadius: "10px",
              border: "1px dashed #334155",
              background: "#0f172a",
              color: uploading ? "#94a3b8" : "#ffffff",
              fontWeight: 700,
              fontSize: "14px",
              cursor: uploading
                ? "not-allowed"
                : "pointer",
            }}
          >
            {uploading
              ? "Uploading..."
              : mediaUrl
              ? "✓ Uploaded — click to replace"
              : `Choose ${
                  type === "image" ? "picture" : "video"
                } file`}

            <input
              type="file"
              accept={
                type === "image"
                  ? "image/jpeg,image/png,image/webp"
                  : "video/mp4,video/webm,video/quicktime"
              }
              onChange={handleMediaUpload}
              disabled={uploading}
              style={{ display: "none" }}
            />
          </label>

          <p
            style={{
              marginTop: "6px",
              fontSize: "12px",
              color: "#94a3b8",
            }}
          >
            {type === "image"
              ? "Pictures are automatically cropped to a 16:9 ratio and compressed."
              : "Videos are uploaded as-is. Please use a 16:9 video for the best display."}
          </p>

          {mediaUrl && (
            <div
              style={{
                marginTop: "14px",
                width: "100%",
                aspectRatio: "16/9",
                borderRadius: "12px",
                overflow: "hidden",
                border: "1px solid #334155",
                background: "#000000",
              }}
            >
              {type === "video" ? (
                <video
                  src={mediaUrl}
                  controls
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <img
                  src={mediaUrl}
                  alt="Banner preview"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              )}
            </div>
          )}

          <label style={labelStyle}>
            Link URL (optional)
          </label>

          <input
            type="url"
            value={linkUrl}
            onChange={(event) =>
              setLinkUrl(event.target.value)
            }
            placeholder="https://example.com/offer"
            style={inputStyle}
          />

          <label style={labelStyle}>Display Order</label>

          <input
            type="number"
            value={order}
            onChange={(event) =>
              setOrder(event.target.value)
            }
            style={inputStyle}
          />

          <label
            style={{
              ...labelStyle,
              display: "flex",
              alignItems: "center",
              gap: "10px",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={active}
              onChange={(event) =>
                setActive(event.target.checked)
              }
            />
            Active (visible on homepage)
          </label>

          <button
            type="submit"
            disabled={loading || uploading}
            style={{
              marginTop: "25px",
              width: "100%",
              padding: "14px",
              borderRadius: "10px",
              border: "none",
              background: "#2563eb",
              color: "#ffffff",
              fontWeight: 800,
              fontSize: "15px",
              cursor:
                loading || uploading
                  ? "not-allowed"
                  : "pointer",
              opacity: loading || uploading ? 0.6 : 1,
            }}
          >
            {loading ? "Saving..." : "Save Banner"}
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

const typeButtonStyle = {
  flex: 1,
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #334155",
  color: "#ffffff",
  fontWeight: 700,
  fontSize: "14px",
  cursor: "pointer",
};
