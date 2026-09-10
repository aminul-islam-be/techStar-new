"use client";

import { useEffect, useState, use as usePromise } from "react";
import { useCurrency } from "@/lib/useCurrency";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCustomerUserId } from "@/lib/customerAuth";

type Product = {
  _id: string;
  name: string;
  slug: string;
  category: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  currency?: string;
  image?: string;
  stock: number;
  featured?: boolean;
  active?: boolean;
};

const RELATED_COUNT = 6;

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { format } = useCurrency();
  const { slug } = usePromise(params);
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [adding, setAdding] = useState(false);
  const [buying, setBuying] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [tab, setTab] = useState<"description" | "reviews">(
    "description"
  );
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const [related, setRelated] = useState<Product[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(true);

  useEffect(() => {
    loadProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function loadProduct() {
    try {
      setLoading(true);
      setError("");
      setQuantity(1);

      const response = await fetch(
        `/api/products/${slug}`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Product not found."
        );
      }

      setProduct(data.product);
      loadRelated(data.product);

      const viewerId = getCustomerUserId();
      if (viewerId && data.product?._id) {
        fetch("/api/history/viewed", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": viewerId,
          },
          body: JSON.stringify({ productId: data.product._id }),
        }).catch(() => {});
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Product not found."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadRelated(current: Product) {
    try {
      setRelatedLoading(true);

      // 1) same-category products first
      const sameCategoryRes = await fetch(
        `/api/products?category=${encodeURIComponent(
          current.category
        )}`,
        { cache: "no-store" }
      );
      const sameCategoryData = await sameCategoryRes.json();

      const sameCategory: Product[] = (
        sameCategoryData.products || []
      ).filter((p: Product) => p._id !== current._id);

      let combined = sameCategory.slice(0, RELATED_COUNT);

      // 2) if not enough, fill the rest from all other products
      if (combined.length < RELATED_COUNT) {
        const allRes = await fetch("/api/products", {
          cache: "no-store",
        });
        const allData = await allRes.json();

        const usedIds = new Set([
          current._id,
          ...combined.map((p) => p._id),
        ]);

        const fillers: Product[] = (
          allData.products || []
        ).filter((p: Product) => !usedIds.has(p._id));

        combined = [
          ...combined,
          ...fillers.slice(0, RELATED_COUNT - combined.length),
        ];
      }

      setRelated(combined);
    } catch {
      setRelated([]);
    } finally {
      setRelatedLoading(false);
    }
  }

  async function addToCart(): Promise<boolean> {
    if (!product) return false;

    const userId = getCustomerUserId();

    if (!userId) {
      router.push("/login");
      return false;
    }

    if (product.stock <= 0) {
      setMessage("This product is out of stock.");
      return false;
    }

    try {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({
          productId: product._id,
          quantity,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Unable to add product to cart."
        );
      }

      return true;
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Unable to add product to cart."
      );
      return false;
    }
  }

  async function handleAddToCart() {
    try {
      setAdding(true);
      setMessage("");

      const success = await addToCart();

      if (success) {
        setMessage(`${product?.name} added to cart.`);
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleBuyNow() {
    try {
      setBuying(true);
      setMessage("");

      const success = await addToCart();

      if (success) {
        router.push("/checkout");
      }
    } finally {
      setBuying(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white px-4 py-20 text-slate-900">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-5xl">📦</div>
          <h1 className="mt-5 text-2xl font-bold">
            Loading product...
          </h1>
        </div>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="min-h-screen bg-white px-4 py-20 text-slate-900">
        <div className="mx-auto max-w-xl text-center">
          <div className="text-5xl">😕</div>
          <h1 className="mt-5 text-2xl font-bold">
            {error || "Product not found."}
          </h1>

          <Link
            href="/"
            className="mt-6 inline-block rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white hover:bg-orange-400"
          >
            {"← Back to Home"}
          </Link>
        </div>
      </main>
    );
  }

  const hasDiscount =
    product.compareAtPrice &&
    product.compareAtPrice > product.price;

  const sku = product._id.slice(-8).toUpperCase();

  return (
    <main className="min-h-screen bg-white pb-24 text-slate-900">
      {/* Breadcrumb */}
      <div className="border-b border-slate-100 bg-white px-4 py-3 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-5xl items-center gap-1.5 overflow-x-auto whitespace-nowrap text-sm text-slate-500">
          <Link href="/" className="hover:text-orange-500">
            Home
          </Link>
          <span>›</span>
          <Link
            href={`/?category=${encodeURIComponent(
              product.category
            )}`}
            className="hover:text-orange-500"
          >
            {product.category}
          </Link>
          <span>›</span>
          <span className="truncate text-slate-400">
            {product.name}
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        {message && (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            ✓ {message}
          </div>
        )}

        <div className="grid gap-10 md:grid-cols-2">
          {/* Image */}
          <div>
            <button
              onClick={() => setLightboxOpen(true)}
              className="mb-3 flex items-center gap-1.5 text-slate-400 hover:text-orange-500"
              aria-label="Zoom image"
            >
              🔍
            </button>

            <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl bg-white">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  onClick={() => setLightboxOpen(true)}
                  className="h-full w-full cursor-zoom-in object-contain"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-6xl text-slate-200">
                  📦
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div>
            <div className="text-sm text-slate-400">
              {product.category}
            </div>

            <h1 className="mt-1 text-2xl font-bold leading-snug text-slate-900 sm:text-3xl">
              {product.name}
            </h1>

            <p className="mt-4 text-sm text-slate-500">
              Availability:{" "}
              <span
                className={`font-bold ${
                  product.stock > 0
                    ? "text-emerald-600"
                    : "text-red-500"
                }`}
              >
                {product.stock > 0
                  ? `${product.stock} in stock`
                  : "Out of stock"}
              </span>
            </p>

            <hr className="my-5 border-slate-100" />

            <div className="text-sm text-slate-400">
              SKU: <span className="text-slate-600">{sku}</span>
            </div>

            <div className="mt-2 flex flex-wrap items-baseline gap-3">
              <span className="text-3xl font-bold text-slate-900">
                {format(product.price)}
              </span>
              {hasDiscount && (
                <span className="text-lg text-slate-400 line-through">
                  {format(product.compareAtPrice as number)}
                </span>
              )}
            </div>

            <div className="mt-6 flex items-center overflow-hidden rounded-full border border-slate-200">
                <button
                  onClick={() =>
                    setQuantity((q) => Math.max(1, q - 1))
                  }
                  className="px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50"
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <input
                  value={quantity}
                  onChange={(event) => {
                    const value = parseInt(
                      event.target.value.replace(/\D/g, ""),
                      10
                    );
                    setQuantity(
                      Number.isNaN(value) ? 1 : Math.max(1, value)
                    );
                  }}
                  className="w-9 border-x border-slate-200 py-1.5 text-center text-xs font-semibold outline-none"
                />
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
          </div>
        </div>

        {/* Description / Reviews */}
        <div className="mt-14">
          <div className="flex gap-8 border-b border-slate-100 text-base">
            <button
              onClick={() => setTab("description")}
              className={`-mb-px border-b-2 pb-3 font-bold transition ${
                tab === "description"
                  ? "border-orange-500 text-slate-900"
                  : "border-transparent text-slate-400"
              }`}
            >
              Description
            </button>
            <button
              onClick={() => setTab("reviews")}
              className={`-mb-px border-b-2 pb-3 font-bold transition ${
                tab === "reviews"
                  ? "border-orange-500 text-slate-900"
                  : "border-transparent text-slate-400"
              }`}
            >
              Reviews
            </button>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-100 p-6">
            {tab === "description" ? (
              product.description ? (
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
                  {product.description}
                </p>
              ) : (
                <p className="text-sm text-slate-400">
                  No description available for this product yet.
                </p>
              )
            ) : (
              <p className="text-sm text-slate-400">
                No reviews yet.
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 text-sm">
              <span className="font-bold text-slate-700">
                SKU:
              </span>
              <span className="text-slate-500">{sku}</span>
              <span className="text-slate-300">/</span>
              <span className="font-bold text-slate-700">
                Category:
              </span>
              <span className="text-slate-500">
                {product.category}
              </span>
            </div>
          </div>
        </div>

        {/* Related products */}
        {(relatedLoading || related.length > 0) && (
          <div className="mt-14">
            <h2 className="text-2xl font-bold text-slate-900">
              Related products
            </h2>
            <div className="mt-2 mb-6 h-[3px] w-20 bg-orange-500" />

            {relatedLoading ? (
              <div className="py-10 text-center text-sm text-slate-400">
                Loading…
              </div>
            ) : (
              <div className="overflow-hidden rounded-3xl border border-slate-100">
                <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-3 lg:grid-cols-4">
                  {related.map((item) => (
                    <article
                      key={item._id}
                      onClick={() =>
                        router.push(`/products/${item.slug}`)
                      }
                      className="group cursor-pointer p-4 sm:p-5"
                    >
                      <div className="mb-1 line-clamp-1 text-[12px] leading-tight text-slate-500">
                        {item.category}
                      </div>

                      <h3 className="mb-3 line-clamp-2 text-[15px] font-bold leading-snug text-blue-700">
                        {item.name}
                      </h3>

                      <div className="mb-3 flex h-36 items-center justify-center sm:h-40">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-full w-full object-contain transition duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="text-5xl">⚡</div>
                        )}
                      </div>

                      <div className="text-lg font-extrabold text-slate-900 sm:text-xl">
                        {format(item.price)}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fixed bottom action bar (stays put while scrolling) */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center gap-2.5">
          <button
            onClick={handleAddToCart}
            disabled={adding || buying || product.stock <= 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-slate-800 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            🛒{" "}
            {adding
              ? "Adding..."
              : product.stock <= 0
                ? "Out of stock"
                : "Add to cart"}
          </button>

          <button
            onClick={handleBuyNow}
            disabled={adding || buying || product.stock <= 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-orange-500 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {buying ? "Processing..." : "Buy Now"}
          </button>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && product.image && (
        <div
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-[100] flex cursor-zoom-out items-center justify-center bg-black/90 p-6"
        >
          <img
            src={product.image}
            alt={product.name}
            className="max-h-full max-w-full object-contain"
          />
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl text-white hover:bg-white/20"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      )}
    </main>
  );
}
