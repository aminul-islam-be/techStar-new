"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCustomerUser } from "@/lib/customerAuth";
import { useCurrency } from "@/lib/useCurrency";

type Product = {
  _id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  currency?: string;
  image?: string;
  stock: number;
};

export default function WishlistPage() {
  const router = useRouter();
  const { format } = useCurrency();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState("");

  useEffect(() => {
    const user = getCustomerUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    loadWishlist(user.id);
  }, []);

  async function loadWishlist(userId: string) {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/wishlist", {
        headers: { "x-user-id": userId },
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to load wishlist."
        );
      }

      setProducts(
        Array.isArray(data.products) ? data.products : []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load wishlist."
      );
    } finally {
      setLoading(false);
    }
  }

  async function removeItem(productId: string) {
    const user = getCustomerUser();
    if (!user) return;

    setRemovingId(productId);

    try {
      await fetch(`/api/wishlist?productId=${productId}`, {
        method: "DELETE",
        headers: { "x-user-id": user.id },
      });

      setProducts((prev) =>
        prev.filter((product) => product._id !== productId)
      );
    } catch (err) {
      console.error(err);
    } finally {
      setRemovingId("");
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/"
          className="text-sm font-medium text-slate-400 hover:text-white"
        >
          ← Continue Shopping
        </Link>

        <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
          উইশলিস্ট (Wishlist)
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          আপনার পছন্দের প্রোডাক্টগুলো এখানে সেভ আছে।
        </p>

        {loading ? (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse overflow-hidden rounded-3xl border border-white/[0.08] bg-slate-900/70"
              >
                <div className="h-48 bg-white/[0.04]" />
                <div className="space-y-3 p-5">
                  <div className="h-4 w-3/4 rounded bg-white/[0.06]" />
                  <div className="h-3 w-1/2 rounded bg-white/[0.04]" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="mt-10 rounded-3xl border border-red-500/20 bg-red-500/[0.06] px-5 py-16 text-center">
            <div className="text-4xl">⚠️</div>
            <h3 className="mt-4 text-xl font-bold">
              Unable to load wishlist
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              {error}
            </p>
          </div>
        ) : products.length === 0 ? (
          <div className="mt-12 flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-20 text-center">
            <div className="mb-4 text-5xl">❤️</div>
            <h2 className="text-lg font-bold text-white">
              এখনো কোনো আইটেম যোগ করা হয়নি
            </h2>
            <p className="mt-2 max-w-sm text-sm text-slate-400">
              প্রোডাক্ট কার্ডে হার্ট আইকনে ট্যাপ করে যেকোনো প্রোডাক্ট
              উইশলিস্টে যোগ করতে পারবেন।
            </p>
            <Link
              href="/#products"
              className="mt-6 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500"
            >
              প্রোডাক্ট দেখুন
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <article
                key={product._id}
                className="group overflow-hidden rounded-3xl border border-white/[0.08] bg-slate-900/70 transition duration-300 hover:-translate-y-1 hover:border-blue-500/30"
              >
                <div
                  onClick={() =>
                    router.push(`/products/${product.slug}`)
                  }
                  className="relative h-44 cursor-pointer overflow-hidden bg-slate-950"
                >
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950 text-5xl">
                      ⚡
                    </div>
                  )}

                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      removeItem(product._id);
                    }}
                    disabled={removingId === product._id}
                    aria-label="Remove from wishlist"
                    className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-red-500/40 bg-red-500/20 text-base shadow-lg backdrop-blur transition hover:bg-red-500/30 disabled:opacity-60"
                  >
                    ❤️
                  </button>
                </div>

                <div className="p-4">
                  <h3 className="line-clamp-2 min-h-[40px] text-sm font-bold leading-5 text-white">
                    {product.name}
                  </h3>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-lg font-extrabold tracking-tight">
                      {format(product.price)}
                    </span>

                    <span
                      className={`text-[11px] font-semibold ${
                        product.stock > 0
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {product.stock > 0
                        ? "In stock"
                        : "Out of stock"}
                    </span>
                  </div>

                  <Link
                    href={`/products/${product.slug}`}
                    className="mt-4 block rounded-xl bg-slate-800 px-3 py-2.5 text-center text-xs font-bold text-white transition hover:bg-slate-700"
                  >
                    View Product
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
