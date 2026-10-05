"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Review = {
  _id: string;
  userName: string;
  rating: number;
  title?: string;
  comment: string;
  images: string[];
  verifiedPurchase: boolean;
  status: string;
  adminNote?: string;
  product?: {
    name: string;
    slug: string;
    vendorName?: string;
  } | null;
  createdAt?: string;
};

export default function AdminReviewsPage() {
  const [status, setStatus] =
    useState("pending");

  const [reviews, setReviews] =
    useState<Review[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");

      const response =
        await fetch(
          `/api/admin/reviews?status=${status}`,
          {
            cache: "no-store",
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Unable to load reviews."
        );
      }

      setReviews(
        data.reviews || []
      );
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
  }, [status]);

  async function moderate(
    id: string,
    nextStatus:
      | "approved"
      | "rejected"
  ) {
    const adminNote =
      window.prompt(
        nextStatus === "rejected"
          ? "Optional rejection note:"
          : "Optional admin note:",
        ""
      ) ?? "";

    try {
      setError("");

      const response =
        await fetch(
          "/api/admin/reviews",
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              id,
              status:
                nextStatus,
              adminNote,
            }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Unable to update review."
        );
      }

      setMessage(
        data.message ||
          "Review updated."
      );

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update review."
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">

      <div className="mx-auto max-w-5xl">

        <div className="flex flex-wrap items-center justify-between gap-4">

          <div>
            <h1 className="text-3xl font-extrabold">
              ⭐ Product Reviews
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Approve, reject and monitor customer reviews.
            </p>
          </div>

          <Link
            href="/admin"
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/15"
          >
            ← Admin
          </Link>

        </div>

        <div className="mt-6 flex flex-wrap gap-2">

          {[
            "pending",
            "approved",
            "rejected",
            "all",
          ].map((item) => (
            <button
              key={item}
              onClick={() =>
                setStatus(item)
              }
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                status === item
                  ? "bg-orange-500 text-white"
                  : "bg-white/10 text-slate-300"
              }`}
            >
              {item}
            </button>
          ))}

        </div>

        {message && (
          <div className="mt-4 rounded-xl bg-emerald-500/15 px-4 py-3 text-sm text-emerald-300">
            ✓ {message}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-slate-400">
            Loading...
          </div>
        ) : reviews.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-slate-400">
            No reviews in this category.
          </div>
        ) : (
          <div className="mt-6 space-y-4">

            {reviews.map(
              (review) => (
                <article
                  key={review._id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5"
                >

                  <div className="flex flex-wrap items-start justify-between gap-3">

                    <div>
                      <div className="font-extrabold">
                        {review.product
                          ?.name ||
                          "Unknown product"}
                      </div>

                      <div className="mt-1 text-xs text-slate-400">
                        Customer:{" "}
                        {review.userName}
                        {" · "}
                        {review.product
                          ?.vendorName ||
                          "TechStar"}
                      </div>
                    </div>

                    <div className="text-amber-400">
                      {"★".repeat(
                        review.rating
                      )}

                      <span className="text-slate-600">
                        {"★".repeat(
                          5 -
                            review.rating
                        )}
                      </span>
                    </div>

                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">

                    {review.verifiedPurchase && (
                      <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-300">
                        ✓ Verified Purchase
                      </span>
                    )}

                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold text-slate-300">
                      {review.status}
                    </span>

                  </div>

                  {review.title && (
                    <h2 className="mt-3 font-bold">
                      {review.title}
                    </h2>
                  )}

                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-300">
                    {review.comment}
                  </p>

                  {review.images?.length >
                    0 && (
                    <div className="mt-3 flex gap-2">

                      {review.images.map(
                        (url) => (
                          <img
                            key={url}
                            src={url}
                            alt="Review"
                            className="h-20 w-20 rounded-lg object-cover"
                          />
                        )
                      )}

                    </div>
                  )}

                  {review.status ===
                    "pending" && (
                    <div className="mt-4 flex flex-wrap gap-2">

                      <button
                        onClick={() =>
                          moderate(
                            review._id,
                            "approved"
                          )
                        }
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold"
                      >
                        ✓ Approve
                      </button>

                      <button
                        onClick={() =>
                          moderate(
                            review._id,
                            "rejected"
                          )
                        }
                        className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold"
                      >
                        ✕ Reject
                      </button>

                    </div>
                  )}

                </article>
              )
            )}

          </div>
        )}

      </div>
    </main>
  );
}
