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
  currency?: string;
  image?: string;
  stock: number;
  featured?: boolean;
  active?: boolean;
};

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

  useEffect(() => {
    loadProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function loadProduct() {
    try {
      setLoading(true);
      setError("");

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
          quantity: 1,
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
      <main className="min-h-screen bg-slate-950 px-4 py-20 text-white">
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
      <main className="min-h-screen bg-slate-950 px-4 py-20 text-white">
        <div className="mx-auto max-w-xl text-center">
          <div className="text-5xl">😕</div>
          <h1 className="mt-5 text-2xl font-bold">
            {error || "Product not found."}
          </h1>

          <Link
            href="/"
            className="mt-6 inline-block rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-500"
          >
            ← Back to Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="text-sm text-slate-400 hover:text-white"
        >
          ← Back to Home
        </Link>

        {message && (
          <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            ✓ {message}
          </div>
        )}

        <div className="mt-6 grid gap-8 md:grid-cols-2">
          <div className="aspect-square w-full overflow-hidden rounded-3xl border border-white/10 bg-slate-900">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-6xl text-slate-700">
                📦
              </div>
            )}
          </div>

          <div>
            <span className="inline-block rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">
              {product.category}
            </span>

            <h1 className="mt-3 text-3xl font-extrabold">
              {product.name}
            </h1>

            <p className="mt-3 text-2xl font-bold text-blue-400">
              {product.currency || "৳"}
              {product.price}
            </p>

            <p
              className={`mt-2 text-sm font-semibold ${
                product.stock > 0
                  ? "text-emerald-400"
                  : "text-red-400"
              }`}
            >
              {product.stock > 0
                ? `In stock (${product.stock} available)`
                : "Out of stock"}
            </p>

            {product.description && (
              <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-slate-300">
                {product.description}
              </p>
            )}

            <div className="mt-8 flex gap-3">
              <button
                onClick={handleAddToCart}
                disabled={
                  adding || buying || product.stock <= 0
                }
                className="flex-1 rounded-xl bg-slate-800 px-5 py-3.5 text-sm font-extrabold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {adding ? "Adding..." : "🛒 Add to Cart"}
              </button>

              <button
                onClick={handleBuyNow}
                disabled={
                  adding || buying || product.stock <= 0
                }
                className="flex-1 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-extrabold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {buying ? "Processing..." : "Buy Now"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
