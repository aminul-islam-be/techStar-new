"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCustomerUserId } from "@/lib/customerAuth";
import { useSite } from "@/lib/siteContext";

type P = { _id: string; name: string; image?: string; vendorName?: string; vendorId?: string };

export default function NewChatPage() {
  const site = useSite();
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<P | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!getCustomerUserId()) {
      router.replace(`/login?redirect=/messages/new/${slug}`);
      return;
    }
    fetch(`/api/products/${slug}`)
      .then((r) => r.json())
      .then((d) => setProduct(d.success ? d.product : null));
  }, [slug, router]);

  async function send() {
    if (!product || !text.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": getCustomerUserId() },
        body: JSON.stringify({ productId: product._id, text }),
      });
      const d = await res.json();
      if (!res.ok || !d.success) {
        setError(d.message || "Message not sent.");
        return;
      }
      router.push(`/messages/${d.conversationId}`);
    } finally {
      setSending(false);
    }
  }

  // products without a vendor are TechStar's own: the chat goes to the owner
  const isPlatform = Boolean(product) && !product?.vendorId;
  const sellerName = product?.vendorName || site.siteName;

  return (
    <main className="min-h-screen bg-slate-950 pb-24 text-white">
      <div className="mx-auto max-w-2xl px-4 py-5">
        <Link href="/messages" className="text-xs text-slate-400">
          ← Messages
        </Link>
        <h1 className="mt-2 text-xl font-extrabold">Ask {product ? sellerName : "the seller"}</h1>

        {!product ? (
          <p className="mt-4 text-sm text-slate-400">Loading...</p>
        ) : (
          <>
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900 p-3">
              {product.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.image} alt="" className="h-14 w-14 rounded-xl bg-white/5 object-contain" />
              ) : (
                <div className="h-14 w-14 rounded-xl bg-white/5" />
              )}
              <div className="min-w-0">
                <p className="truncate font-semibold">{product.name}</p>
                <p className="text-xs text-slate-400">Sold by {sellerName}</p>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] leading-relaxed text-amber-200">
              {isPlatform
                ? `💬 Ask anything about this product, stock, delivery or your order. ${site.siteName} will reply here in your Messages.`
                : `🔒 Ask about the product, stock or delivery. For your safety, phone numbers, links and chat apps are blocked, and every order and payment must stay on ${site.siteName}.`}
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Write your question..."
              className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white outline-none focus:border-blue-500"
            />
            {error && <p className="mt-2 rounded-lg bg-red-500/10 p-2.5 text-xs text-red-300">{error}</p>}
            <button
              onClick={send}
              disabled={sending || !text.trim()}
              className="mt-3 w-full rounded-xl bg-blue-600 p-3 text-sm font-bold disabled:opacity-50"
            >
              {sending ? "Sending..." : "Send message"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
