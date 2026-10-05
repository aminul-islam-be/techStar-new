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
  sellerReply?: string;
  product?: {
    name: string;
    slug: string;
  } | null;
};

export default function VendorReviewsPage() {
  const [reviews, setReviews] =
    useState<Review[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [replying, setReplying] =
    useState<string | null>(null);

  const [reply, setReply] =
    useState("");

  const [message, setMessage] =
    useState("");

  async function load() {
    setLoading(true);

    const response =
      await fetch(
        "/api/vendor/reviews",
        {
          cache: "no-store",
        }
      );

    const data =
      await response.json();

    setReviews(
      data.success
        ? data.reviews || []
        : []
    );

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function saveReply(
    id: string
  ) {
    try {
      const response =
        await fetch(
          `/api/reviews/${id}/reply`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              reply,
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
            "Unable to save reply."
        );
      }

      setMessage(
        "Seller reply saved."
      );

      setReplying(null);
      setReply("");

      await load();
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Unable to save reply."
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">

      <div className="mx-auto max-w-4xl">

        <div className="flex items-center justify-between gap-3">

          <div>
            <h1 className="text-3xl font-extrabold">
              ⭐ Customer Reviews
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Reply to approved reviews for your products.
            </p>
          </div>

          <Link
            href="/vendor"
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold"
          >
            ← Vendor
          </Link>

        </div>

        {message && (
          <div className="mt-4 rounded-xl bg-white/10 px-4 py-3 text-sm">
            {message}
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-slate-400">
            Loading...
          </div>
        ) : reviews.length ===
          0 ? (
          <div className="mt-6 rounded-2xl border border-white/10 p-8 text-center text-slate-400">
            No approved reviews yet.
          </div>
        ) : (
          <div className="mt-6 space-y-4">

            {reviews.map(
              (r) => (
                <article
                  key={r._id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5"
                >

                  <div className="flex flex-wrap justify-between gap-3">

                    <div>
                      <div className="font-extrabold">
                        {r.product
                          ?.name ||
                          "Product"}
                      </div>

                      <div className="text-xs text-slate-400">
                        {r.userName}
                      </div>
                    </div>

                    <div className="text-amber-400">
                      {"★".repeat(
                        r.rating
                      )}

                      <span className="text-slate-600">
                        {"★".repeat(
                          5 - r.rating
                        )}
                      </span>
                    </div>

                  </div>

                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    {r.comment}
                  </p>

                  {r.images?.length >
                    0 && (
                    <div className="mt-3 flex gap-2">

                      {r.images.map(
                        (url) => (
                          <img
                            key={url}
                            src={url}
                            alt="Review"
                            className="h-16 w-16 rounded-lg object-cover"
                          />
                        )
                      )}

                    </div>
                  )}

                  {r.sellerReply ? (
                    <div className="mt-4 rounded-xl bg-slate-900 p-4">

                      <div className="text-xs font-bold text-slate-400">
                        Your reply
                      </div>

                      <p className="mt-1 text-sm text-slate-300">
                        {r.sellerReply}
                      </p>

                      <button
                        onClick={() => {
                          setReplying(
                            r._id
                          );
                          setReply(
                            r.sellerReply ||
                              ""
                          );
                        }}
                        className="mt-2 text-xs font-bold text-blue-400"
                      >
                        Edit reply
                      </button>

                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setReplying(
                          r._id
                        );
                        setReply("");
                      }}
                      className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold"
                    >
                      Reply
                    </button>
                  )}

                  {replying ===
                    r._id && (
                    <div className="mt-3">

                      <textarea
                        value={reply}
                        onChange={(e) =>
                          setReply(
                            e.target
                              .value
                          )
                        }
                        maxLength={1000}
                        rows={4}
                        placeholder="Write your seller reply..."
                        className="w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-sm outline-none"
                      />

                      <div className="mt-2 flex gap-2">

                        <button
                          onClick={() =>
                            saveReply(
                              r._id
                            )
                          }
                          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold"
                        >
                          Save
                        </button>

                        <button
                          onClick={() =>
                            setReplying(
                              null
                            )
                          }
                          className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold"
                        >
                          Cancel
                        </button>

                      </div>

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
