"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type ReviewItem = {
  _id: string;
  userName: string;
  userProfilePicture?: string;
  rating: number;
  title?: string;
  comment: string;
  images: string[];
  verifiedPurchase: boolean;
  sellerReply?: string;
  sellerReplyAt?: string | null;
  createdAt?: string;
};

type MyReview = {
  _id: string;
  rating: number;
  title: string;
  comment: string;
  images: string[];
  verifiedPurchase: boolean;
  status: "pending" | "approved" | "rejected";
  sellerReply?: string;
};

function Stars({
  value,
  size = "text-lg",
}: {
  value: number;
  size?: string;
}) {
  return (
    <span
      className={`${size} tracking-tight`}
      aria-label={`${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={
            n <= Math.round(value)
              ? "text-amber-400"
              : "text-slate-300"
          }
        >
          ★
        </span>
      ))}
    </span>
  );
}

export default function ProductReviews({
  slug,
}: {
  slug: string;
}) {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);

  const [summary, setSummary] = useState({
    count: 0,
    average: 0,
    distribution: {
      "1": 0,
      "2": 0,
      "3": 0,
      "4": 0,
      "5": 0,
    },
  });

  const [verifiedPurchase, setVerifiedPurchase] =
    useState(false);

  const [myReview, setMyReview] =
    useState<MyReview | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [images, setImages] = useState<string[]>([]);

  async function load() {
    try {
      setLoading(true);
      setError("");

      const userId = getCustomerUserId();

      const response = await fetch(
        `/api/products/${encodeURIComponent(slug)}/reviews`,
        {
          cache: "no-store",
          headers: userId
            ? { "x-user-id": userId }
            : {},
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to load reviews."
        );
      }

      setReviews(
        Array.isArray(data.reviews)
          ? data.reviews
          : []
      );

      setSummary(
        data.summary || {
          count: 0,
          average: 0,
          distribution: {
            "1": 0,
            "2": 0,
            "3": 0,
            "4": 0,
            "5": 0,
          },
        }
      );

      setVerifiedPurchase(
        Boolean(data.verifiedPurchase)
      );

      setMyReview(data.myReview || null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load reviews."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [slug]);

  async function uploadImages(
    files: FileList | null
  ) {
    if (!files?.length) return;

    const cloud =
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

    const preset =
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ||
      "techstar_profiles";

    if (!cloud) {
      setError(
        "Cloudinary image upload is not configured."
      );
      return;
    }

    setUploading(true);
    setError("");

    try {
      const urls: string[] = [];

      for (
        const file of Array.from(files).slice(
          0,
          3 - images.length
        )
      ) {
        if (!file.type.startsWith("image/")) {
          continue;
        }

        if (file.size > 5 * 1024 * 1024) {
          throw new Error(
            "Each review image must be 5 MB or smaller."
          );
        }

        const form = new FormData();

        form.append("file", file);
        form.append("upload_preset", preset);

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${cloud}/image/upload`,
          {
            method: "POST",
            body: form,
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error?.message ||
              "Image upload failed."
          );
        }

        if (data.secure_url) {
          urls.push(data.secure_url);
        }
      }

      setImages((current) =>
        [...current, ...urls].slice(0, 3)
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Image upload failed."
      );
    } finally {
      setUploading(false);
    }
  }

  async function submitReview() {
    const userId = getCustomerUserId();

    if (!userId) {
      window.location.href = "/login";
      return;
    }

    if (!verifiedPurchase) {
      setError(
        "You can review this product after you receive it."
      );
      return;
    }

    if (comment.trim().length < 3) {
      setError(
        "Please write at least a short review."
      );
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setMessage("");

      const response = await fetch(
        `/api/products/${encodeURIComponent(slug)}/reviews`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": userId,
          },
          body: JSON.stringify({
            rating,
            title,
            comment,
            images,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to submit review."
        );
      }

      setMessage(
        data.message || "Review submitted."
      );

      setTitle("");
      setComment("");
      setImages([]);

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to submit review."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const maxCount = useMemo(
    () =>
      Math.max(
        1,
        ...Object.values(
          summary.distribution || {}
        ).map(Number)
      ),
    [summary.distribution]
  );

  return (
    <div className="space-y-6">

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          ✓ {message}
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-sm text-slate-400">
          Loading reviews...
        </div>
      ) : (
        <>

          <div className="grid gap-6 rounded-2xl bg-slate-50 p-5 md:grid-cols-[180px_1fr]">

            <div className="text-center md:border-r md:border-slate-200 md:pr-6">

              <div className="text-4xl font-extrabold text-slate-900">
                {summary.average.toFixed(1)}
              </div>

              <Stars
                value={summary.average}
                size="text-xl"
              />

              <div className="mt-1 text-xs text-slate-500">
                {summary.count}{" "}
                {summary.count === 1
                  ? "Review"
                  : "Reviews"}
              </div>

            </div>

            <div className="space-y-2">

              {[5, 4, 3, 2, 1].map((star) => {
                const count = Number(
                  summary.distribution?.[
                    String(star)
                  ] || 0
                );

                return (
                  <div
                    key={star}
                    className="flex items-center gap-3 text-xs"
                  >
                    <span className="w-8 font-bold">
                      {star} ★
                    </span>

                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-amber-400"
                        style={{
                          width: `${
                            (count / maxCount) *
                            100
                          }%`,
                        }}
                      />
                    </div>

                    <span className="w-6 text-right text-slate-500">
                      {count}
                    </span>
                  </div>
                );
              })}

            </div>

          </div>

          {myReview ? (
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">

              <div className="flex items-center justify-between gap-3">

                <h3 className="font-extrabold text-slate-900">
                  Your Review
                </h3>

                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-orange-700">
                  {myReview.status}
                </span>

              </div>

              <div className="mt-2">
                <Stars value={myReview.rating} />
              </div>

              {myReview.title && (
                <div className="mt-2 font-bold">
                  {myReview.title}
                </div>
              )}

              <p className="mt-1 whitespace-pre-line text-sm text-slate-700">
                {myReview.comment}
              </p>

              {myReview.status === "pending" && (
                <p className="mt-3 text-xs text-orange-700">
                  Your review is waiting for admin approval.
                </p>
              )}

            </div>
          ) : verifiedPurchase ? (

            <div className="rounded-2xl border border-slate-200 p-5">

              <h3 className="text-lg font-extrabold">
                Write a Review
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                ✓ Verified purchase: you received this product.
              </p>

              <div className="mt-4">

                <p className="mb-2 text-sm font-bold">
                  Your rating
                </p>

                <div className="flex gap-1">

                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="text-3xl leading-none"
                    >
                      <span
                        className={
                          star <= rating
                            ? "text-amber-400"
                            : "text-slate-300"
                        }
                      >
                        ★
                      </span>
                    </button>
                  ))}

                </div>

              </div>

              <input
                value={title}
                onChange={(e) =>
                  setTitle(e.target.value)
                }
                maxLength={120}
                placeholder="Review title (optional)"
                className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-400"
              />

              <textarea
                value={comment}
                onChange={(e) =>
                  setComment(e.target.value)
                }
                maxLength={1500}
                rows={5}
                placeholder="How was the product?"
                className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-400"
              />

              <div className="mt-3">

                <label className="inline-flex cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold hover:bg-slate-100">

                  📷 Add photos (max 3)

                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) =>
                      uploadImages(e.target.files)
                    }
                    disabled={
                      uploading ||
                      images.length >= 3
                    }
                  />

                </label>

                {uploading && (
                  <span className="ml-3 text-xs text-slate-500">
                    Uploading...
                  </span>
                )}

                {images.length > 0 && (
                  <div className="mt-3 flex gap-2">

                    {images.map((url) => (
                      <img
                        key={url}
                        src={url}
                        alt="Review"
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                    ))}

                  </div>
                )}

              </div>

              <button
                type="button"
                onClick={submitReview}
                disabled={submitting || uploading}
                className="mt-4 rounded-xl bg-orange-500 px-5 py-3 text-sm font-extrabold text-white hover:bg-orange-600 disabled:opacity-50"
              >
                {submitting
                  ? "Submitting..."
                  : "Submit Review"}
              </button>

            </div>

          ) : (

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">

              Buy and receive this product to leave a verified review.

              <Link
                href="/login"
                className="ml-2 font-bold text-orange-600"
              >
                Login
              </Link>

            </div>

          )}

        </>
      )}

    </div>
  );
}

function getCustomerUserId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return (
    localStorage.getItem("userId") ||
    localStorage.getItem("customerUserId") ||
    localStorage.getItem("techstar_user_id") ||
    ""
  );
}
