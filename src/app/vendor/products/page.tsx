"use client";

import { useCallback, useEffect, useState } from "react";
import { categories } from "@/lib/categories";
import { money, useVendor } from "@/lib/vendorContext";

type P = {
  _id: string;
  name: string;
  category: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  image?: string;
  images?: string[];
  active: boolean;
  approvalStatus?: string;
  rejectionReason?: string;
};

const field =
  "w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white outline-none focus:border-blue-500";

const badge: Record<string, string> = {
  approved: "bg-emerald-500/20 text-emerald-300",
  pending: "bg-amber-500/20 text-amber-300",
  rejected: "bg-red-500/20 text-red-300",
  suspended: "bg-slate-500/20 text-slate-300",
};

const emptyForm = { name: "", category: categories[0][1], description: "", price: "", compareAtPrice: "", stock: "" };

export default function VendorProductsPage() {
  const { vendor } = useVendor();
  const [products, setProducts] = useState<P[] | null>(null);
  const [editing, setEditing] = useState<P | "new" | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/vendor/products", { cache: "no-store" });
    const d = await res.json();
    setProducts(d.success ? d.products : []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openNew() {
    setForm(emptyForm);
    setImages([]);
    setMsg(null);
    setEditing("new");
  }

  function openEdit(p: P) {
    setForm({
      name: p.name,
      category: p.category,
      description: p.description || "",
      price: String(p.price),
      compareAtPrice: p.compareAtPrice ? String(p.compareAtPrice) : "",
      stock: String(p.stock),
    });
    setImages(p.images?.length ? p.images : p.image ? [p.image] : []);
    setMsg(null);
    setEditing(p);
  }

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "techstar_profiles";
    if (!cloud) {
      setMsg({ ok: false, text: "Image upload is not configured (Cloudinary cloud name missing)." });
      return;
    }
    setUploading(true);
    setMsg(null);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files).slice(0, 5 - images.length)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("upload_preset", preset);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: "POST", body: fd });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error?.message || "Upload failed.");
        urls.push(d.secure_url);
      }
      setImages((cur) => [...cur, ...urls].slice(0, 5));
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Upload failed." });
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const isNew = editing === "new";
      const payload = { ...form, image: images[0] || "", images };
      const res = await fetch(isNew ? "/api/vendor/products" : `/api/vendor/products/${(editing as P)._id}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok || !d.success) throw new Error(d.message || "Unable to save.");
      setEditing(null);
      await load();
      setMsg({ ok: true, text: d.message || "Saved." });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Unable to save." });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(p: P) {
    await fetch(`/api/vendor/products/${p._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !p.active }),
    });
    load();
  }

  async function remove(p: P) {
    if (!confirm(`Delete "${p.name}"?`)) return;
    await fetch(`/api/vendor/products/${p._id}`, { method: "DELETE" });
    load();
  }

  const approved = vendor?.status === "approved";

  if (editing) {
    return (
      <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-900 p-4">
        <h1 className="text-lg font-extrabold">{editing === "new" ? "Add product" : "Edit product"}</h1>
        <input className={field} placeholder="Product name *" value={form.name} onChange={set("name")} />
        <select className={field} value={form.category} onChange={set("category")}>
          {categories.map((c) => (
            <option key={c[1]} value={c[1]}>
              {c[1]}
            </option>
          ))}
        </select>
        <textarea className={field} rows={4} placeholder="Description" value={form.description} onChange={set("description")} />
        <div className="grid grid-cols-2 gap-3">
          <input className={field} type="number" placeholder="Price (৳) *" value={form.price} onChange={set("price")} />
          <input className={field} type="number" placeholder="Old price (optional)" value={form.compareAtPrice} onChange={set("compareAtPrice")} />
        </div>
        <input className={field} type="number" placeholder="Stock quantity *" value={form.stock} onChange={set("stock")} />

        <div>
          <p className="mb-2 text-xs text-slate-400">Photos (first one is the main photo, max 5)</p>
          <div className="flex flex-wrap gap-2">
            {images.map((url, i) => (
              <div key={url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-16 w-16 rounded-lg bg-white/5 object-cover" />
                <button
                  onClick={() => setImages((cur) => cur.filter((_, idx) => idx !== i))}
                  className="absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full bg-red-600 text-xs"
                >
                  ×
                </button>
              </div>
            ))}
            {images.length < 5 && (
              <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border border-dashed border-slate-600 text-2xl text-slate-400">
                {uploading ? "…" : "+"}
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
              </label>
            )}
          </div>
        </div>

        {editing !== "new" && (
          <p className="text-xs text-slate-500">Changing the name, photos, category or description sends the product for admin review again.</p>
        )}
        {msg && <p className={`text-sm ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</p>}

        <div className="flex gap-2">
          <button onClick={() => setEditing(null)} className="flex-1 rounded-xl border border-white/10 p-3 text-sm">
            Cancel
          </button>
          <button onClick={save} disabled={saving || uploading} className="flex-1 rounded-xl bg-blue-600 p-3 text-sm font-bold disabled:opacity-60">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold">My products</h1>
        <button
          onClick={openNew}
          disabled={!approved}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold disabled:opacity-40"
        >
          + Add product
        </button>
      </div>
      {!approved && <p className="text-xs text-amber-300">You can add products after the admin approves your shop.</p>}
      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</p>}

      {!products ? (
        <p className="text-slate-400">Loading...</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-slate-400">No products yet.</p>
      ) : (
        products.map((p) => (
          <div key={p._id} className="rounded-2xl border border-white/10 bg-slate-900 p-3">
            <div className="flex gap-3">
              {p.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image} alt="" className="h-16 w-16 rounded-xl bg-white/5 object-contain" />
              ) : (
                <div className="h-16 w-16 rounded-xl bg-white/5" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{p.name}</p>
                <p className="text-sm text-slate-300">
                  {money(p.price)} · Stock {p.stock}
                </p>
                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${badge[p.approvalStatus || "approved"]}`}>
                  {p.approvalStatus || "approved"}
                </span>
                {!p.active && <span className="ml-2 text-[11px] text-slate-500">hidden</span>}
              </div>
            </div>
            {p.approvalStatus === "rejected" && p.rejectionReason && (
              <p className="mt-2 text-xs text-red-300">Rejected: {p.rejectionReason}</p>
            )}
            <div className="mt-3 flex gap-2 text-xs">
              <button onClick={() => openEdit(p)} disabled={!approved} className="rounded-lg border border-white/10 px-3 py-1.5 disabled:opacity-40">
                Edit
              </button>
              <button onClick={() => toggleActive(p)} disabled={!approved} className="rounded-lg border border-white/10 px-3 py-1.5 disabled:opacity-40">
                {p.active ? "Hide" : "Show"}
              </button>
              <button onClick={() => remove(p)} className="rounded-lg border border-red-500/30 px-3 py-1.5 text-red-300">
                Delete
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
