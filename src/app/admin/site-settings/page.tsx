"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSiteRefresh } from "@/lib/siteContext";
import { DEFAULT_SITE, type SiteSettings } from "@/lib/siteDefaults";

const input =
  "mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500";

export default function AdminSiteSettingsPage() {
  const refreshSite = useSiteRefresh();
  const [s, setS] = useState<SiteSettings | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<"" | "logoUrl" | "faviconUrl">("");

  useEffect(() => {
    fetch("/api/admin/site-settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => (d.success ? setS(d.site) : setMsg({ ok: false, text: d.message || "Please login as admin first (/admin/login)." })));
  }, []);

  const set = (k: keyof SiteSettings) => (e: { target: { value: string } }) => s && setS({ ...s, [k]: e.target.value });

  async function upload(field: "logoUrl" | "faviconUrl", file: File | undefined) {
    if (!file || !s) return;
    const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "techstar_profiles";
    if (!cloud) {
      setMsg({ ok: false, text: "Image upload is not set up (Cloudinary cloud name is missing). You can paste an image link instead." });
      return;
    }
    setUploading(field);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", preset);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error?.message || "Upload failed.");
      setS({ ...s, [field]: d.secure_url });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Upload failed." });
    } finally {
      setUploading("");
    }
  }

  async function save() {
    if (!s) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/site-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      const d = await res.json();
      if (!res.ok || !d.success) throw new Error(d.message || "Could not save.");
      await refreshSite(); // the whole site updates right now, no reload needed
      setMsg({ ok: true, text: "Saved. The new name, logo and contact info now show on the whole website." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not save." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white">
      <div className="mx-auto max-w-2xl">
        <Link href="/admin" className="text-xs text-slate-400">
          ← Admin dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold">Website settings</h1>
        <p className="mt-1 text-xs text-slate-400">
          Change the name, logo and contact info here. They are used everywhere: header, footer, browser tab, invoices, support page
          and the installable app. Nothing is typed into the pages themselves.
        </p>

        {msg && (
          <p className={`mt-3 rounded-lg p-3 text-sm ${msg.ok ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>{msg.text}</p>
        )}

        {s && (
          <>
            {/* live preview */}
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900 p-4">
              {s.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.logoUrl} alt="" className="h-12 w-12 rounded-xl object-contain" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-xl font-black">
                  {s.siteName.trim().charAt(0).toUpperCase() || "S"}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-lg font-extrabold">{s.siteName || "Website name"}</p>
                <p className="truncate text-xs text-slate-400">{s.tagline}</p>
              </div>
            </div>

            <div className="mt-4 space-y-4 rounded-2xl border border-white/10 bg-slate-900 p-4">
              <h2 className="font-bold">Name &amp; look</h2>
              <label className="block text-xs text-slate-400">
                Website name *
                <input className={input} value={s.siteName} maxLength={60} onChange={set("siteName")} />
              </label>
              <label className="block text-xs text-slate-400">
                Tagline
                <input className={input} value={s.tagline} maxLength={100} onChange={set("tagline")} placeholder="e.g. Smart Marketplace" />
              </label>
              <label className="block text-xs text-slate-400">
                Short description (shown on Google)
                <textarea className={input} rows={2} maxLength={300} value={s.description} onChange={set("description")} />
              </label>

              <div className="text-xs text-slate-400">
                Logo
                <div className="mt-1 flex gap-2">
                  <input className={`${input} mt-0`} value={s.logoUrl} onChange={set("logoUrl")} placeholder="https://... (or upload)" />
                  <label className="flex shrink-0 cursor-pointer items-center rounded-lg border border-white/10 px-3 text-xs">
                    {uploading === "logoUrl" ? "..." : "Upload"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => upload("logoUrl", e.target.files?.[0])} />
                  </label>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">Leave empty to show the first letter of the name instead.</p>
              </div>

              <div className="text-xs text-slate-400">
                Browser tab icon (optional)
                <div className="mt-1 flex gap-2">
                  <input className={`${input} mt-0`} value={s.faviconUrl} onChange={set("faviconUrl")} placeholder="Empty = use the logo" />
                  <label className="flex shrink-0 cursor-pointer items-center rounded-lg border border-white/10 px-3 text-xs">
                    {uploading === "faviconUrl" ? "..." : "Upload"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => upload("faviconUrl", e.target.files?.[0])} />
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-4 rounded-2xl border border-white/10 bg-slate-900 p-4">
              <h2 className="font-bold">Contact info</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs text-slate-400">
                  Support email
                  <input className={input} type="email" value={s.supportEmail} onChange={set("supportEmail")} />
                </label>
                <label className="block text-xs text-slate-400">
                  Support phone
                  <input className={input} type="tel" value={s.supportPhone} onChange={set("supportPhone")} />
                </label>
              </div>
              <label className="block text-xs text-slate-400">
                Address (shown on invoices, one line per row)
                <textarea className={input} rows={3} maxLength={300} value={s.address} onChange={set("address")} />
              </label>
              <label className="block text-xs text-slate-400">
                Facebook page link
                <input className={input} value={s.facebookUrl} onChange={set("facebookUrl")} placeholder="https://facebook.com/yourpage" />
              </label>
            </div>

            <div className="mt-4 flex gap-3">
              <button onClick={save} disabled={busy} className="flex-1 rounded-xl bg-blue-600 p-3 text-sm font-bold disabled:opacity-60">
                {busy ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => setS({ ...DEFAULT_SITE })}
                className="rounded-xl border border-white/10 px-4 text-xs text-slate-300"
                title="Fills the form with the original values. Press Save to apply."
              >
                Reset form
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
