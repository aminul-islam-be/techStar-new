"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getCustomerUserId } from "@/lib/customerAuth";

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
  adminNote?: string;
  sellerReply?: string;
};

const EMPTY_SUMMARY = {
  count: 0,
  average: 0,
  distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 } as Record<
    string,
    number
  >,
};

function Stars({
  value,
  size = "text-lg",
}: {
  value: number;
  size?: string;
}) {
  return (
    <span className={`${size} tracking-tight`} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={n <= Math.round(value) ? "text-amber-400" : "text-slate-300"}
        >
          ★
        </span>
      ))}
    </span>
  );
}

const RATING_WORDS = ["", "Very bad", "Bad", "Okay", "Good", "Excellent"];

export default function ProductReviews({ slug }: { slug: string }) {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loggedIn, setLoggedIn] = useState(false);
  const [localUser, setLocalUser] = useState(false);
  const [verifiedPurchase, setVerifiedPurchase] = useState(false);
  const [myReview, setMyReview] = useState<MyReview | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [images, setImages] = useState<string[]>([]);

  const endpoint = `/api/products/${encodeURIComponent(slug)}/reviews`;

  async function load() {
    try {
      setLoading(true);
      setError("");
      setLocalUser(Boolean(getCustomerUserId()));

      const response = await fetch(endpoint, { cache: "no-store" });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load reviews.");
      }

      setReviews(Array.isArray(data.reviews) ? data.reviews : []);
      setSummary(data.summary || EMPTY_SUMMARY);
      setLoggedIn(Boolean(data.loggedIn));
      setVerifiedPurchase(Boolean(data.verifiedPurchase));
      setMyReview(data.myReview || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load reviews.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
    load();
  }, [slug]);

  function resetForm() {
    setRating(5);
    setTitle("");
    setComment("");
    setImages([]);
  }

  function startEdit() {
    if (!myReview) return;

    setRating(myReview.rating);
    setTitle(myReview.title || "");
    setComment(myReview.comment || "");
    setImages(myReview.images || []);
    setEditing(true);
    setError("");
    setMessage("");
  }

  function cancelEdit() {
    setEditing(false);
    resetForm();
    setError("");
  }

  async function uploadImages(files: FileList | null) {
    if (!files?.length) return;

    const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const preset =
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "techstar_profiles";

    if (!cloud) {
      setError("Cloudinary image upload is not configured.");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const urls: string[] = [];

      for (const file of Array.from(files).slice(0, 3 - images.length)) {
        if (!file.type.startsWith("image/")) continue;

        if (file.size > 5 * 1024 * 1024) {
          throw new Error("Each review image must be 5 MB or smaller.");
        }

        const form = new FormData();
        form.append("file", file);
        form.append("upload_preset", preset);

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${cloud}/image/upload`,
          { method: "POST", body: form }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error?.message || "Image upload failed.");
        }

        if (data.secure_url) urls.push(data.secure_url);
      }

      setImages((current) => [...current, ...urls].slice(0, 3));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function submitReview() {
    if (comment.trim().length < 3) {
      setError("Please write at least a short review.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setMessage("");

      const response = await fetch(endpoint, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, title, comment, images }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to submit review.");
      }

      setMessage(data.message || "Review submitted.");
      setEditing(false);
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit review.");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteReview() {
    if (!window.confirm("Delete your review? You can write a new one later.")) {
      return;
    }

    try {
      setDeleting(true);
      setError("");
      setMessage("");

      const response = await fetch(endpoint, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to delete review.");
      }

      setMessage(data.message || "Review deleted.");
      setEditing(false);
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete review.");
    } finally {
      setDeleting(false);
    }
  }

  const maxCount = useMemo(
    () => Math.max(1, ...Object.values(summary.distribution || {}).map(Number)),
    [summary.distribution]
  );

  const loginHref =
    typeof window !== "undefined"
      ? `/login?redirect=${encodeURIComponent(`${window.location.pathname}?tab=reviews`)}`
      : "/login";

  const showForm = loggedIn && verifiedPurchase && (!myReview || editing);

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
          {/* ---------- summary ---------- */}
          <div className="grid gap-6 rounded-2xl bg-slate-50 p-5 md:grid-cols-[180px_1fr]">
            <div className="text-center md:border-r md:border-slate-200 md:pr-6">
              <div className="text-4xl font-extrabold text-slate-900">
                {summary.average.toFixed(1)}
              </div>
              <Stars value={summary.average} size="text-xl" />
              <div className="mt-1 text-xs text-slate-500">
                {summary.count} {summary.count === 1 ? "Review" : "Reviews"}
              </div>
            </div>

            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = Number(summary.distribution?.[String(star)] || 0);

                return (
                  <div key={star} className="flex items-center gap-3 text-xs">
                    <span className="w-8 font-bold">{star} ★</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-amber-400"
                        style={{ width: `${(count / maxCount) * 100}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-slate-500">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ---------- my review ---------- */}
          {myReview && !editing && (
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-extrabold text-slate-900">Your Review</h3>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold capitalize text-orange-700">
                  {myReview.status}
                </span>
              </div>

              <div className="mt-2">
                <Stars value={myReview.rating} />
              </div>

              {myReview.title && (
                <div className="mt-2 font-bold">{myReview.title}</div>
              )}

              <p className="mt-1 whitespace-pre-line text-sm text-slate-700">
                {myReview.comment}
              </p>

              {myReview.images?.length > 0 && (
                <div className="mt-3 flex gap-2">
                  {myReview.images.map((url) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={url}
                      src={url}
                      alt="Review"
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  ))}
                </div>
              )}

              {myReview.status === "pending" && (
                <p className="mt-3 text-xs text-orange-700">
                  Your review is waiting for admin approval.
                </p>
              )}

              {myReview.status === "rejected" && (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                  This review was not approved
                  {myReview.adminNote ? `: ${myReview.adminNote}` : "."} You can
                  edit it and send it again.
                </p>
              )}

              {myReview.sellerReply && (
                <div className="mt-3 rounded-lg bg-white px-3 py-2 text-xs text-slate-600">
                  <b>Seller reply:</b> {myReview.sellerReply}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={startEdit}
                  className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  ✏️ Edit
                </button>
                <button
                  type="button"
                  onClick={deleteReview}
                  disabled={deleting}
                  className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "🗑 Delete"}
                </button>
              </div>
            </div>
          )}

          {/* ---------- write / edit form ---------- */}
          {showForm && (
            <div className="rounded-2xl border border-slate-200 p-5">
              <h3 className="text-lg font-extrabold">
                {editing ? "Edit your review" : "Write a Review"}
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                ✓ Verified purchase: you received this product.
                {editing && " After editing, the review goes for approval again."}
              </p>

              <div className="mt-4">
                <p className="mb-2 text-sm font-bold">Your rating</p>

                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      aria-label={`${star} star`}
                      className="text-3xl leading-none"
                    >
                      <span
                        className={star <= rating ? "text-amber-400" : "text-slate-300"}
                      >
                        ★
                      </span>
                    </button>
                  ))}

                  <span className="ml-2 text-sm font-semibold text-slate-500">
                    {RATING_WORDS[rating]}
                  </span>
                </div>
              </div>

              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder="Review title (optional)"
                className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-400"
              />

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={1500}
                rows={5}
                placeholder="How was the product? Quality, packing, delivery..."
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
                    onChange={(e) => {
                      uploadImages(e.target.files);
                      e.target.value = "";
                    }}
                    disabled={uploading || images.length >= 3}
                  />
                </label>

                {uploading && (
                  <span className="ml-3 text-xs text-slate-500">Uploading...</span>
                )}

                {images.length > 0 && (
                  <div className="mt-3 flex gap-2">
                    {images.map((url) => (
                      <div key={url} className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt="Review"
                          className="h-16 w-16 rounded-lg object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setImages((current) => current.filter((u) => u !== url))
                          }
                          aria-label="Remove photo"
                          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[11px] font-bold text-white"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={submitReview}
                  disabled={submitting || uploading}
                  className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-extrabold text-white hover:bg-orange-600 disabled:opacity-50"
                >
                  {submitting
                    ? "Submitting..."
                    : editing
                      ? "Save Changes"
                      : "Submit Review"}
                </button>

                {editing && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="rounded-xl px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ---------- why can't I review? ---------- */}
          {!myReview && !showForm && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
              {!loggedIn && localUser ? (
                <>
                  Your login session has expired. Please login again to write a
                  review.
                  <Link href={loginHref} className="ml-2 font-bold text-orange-600">
                    Login
                  </Link>
                </>
              ) : !loggedIn ? (
                <>
                  Login to write a review.
                  <Link href={loginHref} className="ml-2 font-bold text-orange-600">
                    Login
                  </Link>
                </>
              ) : (
                <>Buy and receive this product to leave a verified review.</>
              )}
            </div>
          )}

          {/* ---------- all approved reviews ---------- */}
          <div className="space-y-4">
            <h3 className="font-extrabold text-slate-900">
              Customer reviews ({summary.count})
            </h3>

            {reviews.length === 0 ? (
              <p className="text-sm text-slate-400">
                No reviews yet. Be the first to review this product.
              </p>
            ) : (
              reviews.map((item) => (
                <div
                  key={item._id}
                  className="rounded-2xl border border-slate-100 p-4"
                >
                  <div className="flex items-center gap-3">
                    {item.userProfilePicture ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.userProfilePicture}
                        alt=""
                        className="h-9 w-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-700">
                        {item.userName?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-slate-900">
                        {item.userName}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <Stars value={item.rating} size="text-sm" />
                        {item.verifiedPurchase && (
                          <span className="font-semibold text-emerald-600">
                            ✓ Verified purchase
                          </span>
                        )}
                        {item.createdAt && (
                          <span>
                            {new Date(item.createdAt).toLocaleDateString("en-GB")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {item.title && (
                    <div className="mt-3 text-sm font-bold text-slate-900">
                      {item.title}
                    </div>
                  )}

                  <p className="mt-1 whitespace-pre-line text-sm text-slate-700">
                    {item.comment}
                  </p>

                  {item.images?.length > 0 && (
                    <div className="mt-3 flex gap-2">
                      {item.images.map((url) => (
                        <a key={url} href={url} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt="Review"
                            className="h-20 w-20 rounded-lg object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  )}

                  {item.sellerReply && (
                    <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      <b className="text-slate-800">Seller reply:</b>{" "}
                      {item.sellerReply}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
