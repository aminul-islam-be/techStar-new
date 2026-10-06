"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/language";
import { getCustomerUserId } from "@/lib/customerAuth";
import AddressForm, { SavedAddress, titleIcon } from "@/components/AddressForm";

const MAX_ADDRESSES = 10;

export default function AddressesPage() {
  const { t } = useLanguage();

  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [needLogin, setNeedLogin] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SavedAddress | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError("");

      const hasLocalUser = Boolean(getCustomerUserId());
      const response = await fetch("/api/addresses", { cache: "no-store" });
      const data = await response.json();

      if (response.status === 401) {
        setNeedLogin(!hasLocalUser);
        setSessionExpired(hasLocalUser);
        setAddresses([]);
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load addresses.");
      }

      setNeedLogin(false);
      setSessionExpired(false);
      setAddresses(data.addresses || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load addresses.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
    setMessage("");
  }

  function openEdit(address: SavedAddress) {
    setEditing(address);
    setFormOpen(true);
    setMessage("");
  }

  async function setDefault(address: SavedAddress) {
    try {
      setBusyId(address._id);
      setError("");
      setMessage("");

      const response = await fetch(`/api/addresses/${address._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setDefault: true }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to set default.");
      }

      setMessage(`${address.title} is now your default address.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to set default.");
    } finally {
      setBusyId("");
    }
  }

  async function remove(address: SavedAddress) {
    if (!window.confirm(`Delete your ${address.title} address?`)) return;

    try {
      setBusyId(address._id);
      setError("");
      setMessage("");

      const response = await fetch(`/api/addresses/${address._id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to delete address.");
      }

      setMessage("Address deleted.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete address.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="text-sm font-medium text-slate-400 hover:text-white"
        >
          {`← ${t("settings.continueShopping")}`}
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              {t("addresses.title")}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              {t("addresses.subtitle")}
            </p>
          </div>

          {!needLogin && !sessionExpired && addresses.length < MAX_ADDRESSES && (
            <button
              type="button"
              onClick={openAdd}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-500"
            >
              + Add New Address
            </button>
          )}
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            ⚠️ {error}
          </div>
        )}

        {message && (
          <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            ✓ {message}
          </div>
        )}

        {loading ? (
          <p className="mt-10 text-center text-sm text-slate-400">Loading...</p>
        ) : needLogin || sessionExpired ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-14 text-center">
            <div className="mb-4 text-5xl">🔒</div>
            <h2 className="text-lg font-bold">
              {sessionExpired
                ? "Your login session has expired"
                : "Please login to see your addresses"}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {sessionExpired
                ? "Logout and login again, then come back here."
                : "Your saved addresses are linked to your account."}
            </p>
            <Link
              href="/login?redirect=/addresses"
              className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-500"
            >
              Login
            </Link>
          </div>
        ) : addresses.length === 0 ? (
          <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-20 text-center">
            <div className="mb-4 text-5xl">📍</div>
            <h2 className="text-lg font-bold text-white">
              {t("addresses.noSaved")}
            </h2>
            <p className="mt-2 max-w-sm text-sm text-slate-400">
              Add your Home or Office address once, and pick it with one tap at
              checkout.
            </p>
            <button
              type="button"
              onClick={openAdd}
              className="mt-6 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-500"
            >
              + Add New Address
            </button>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {addresses.map((a) => (
              <div
                key={a._id}
                className={`rounded-2xl border p-5 ${
                  a.isDefault
                    ? "border-blue-500/60 bg-blue-500/[0.07]"
                    : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-extrabold">
                    {titleIcon(a.title)} {a.title}
                  </h2>
                  {a.isDefault && (
                    <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-[11px] font-bold">
                      Default
                    </span>
                  )}
                </div>

                <p className="mt-2 text-sm font-semibold">{a.name}</p>
                <p className="text-sm text-slate-300">{a.phone}</p>
                <p className="mt-1 text-sm text-slate-400">
                  {[a.address, a.area, a.city, a.division && `${a.division} Division`]
                    .filter(Boolean)
                    .join(", ")}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(a)}
                    disabled={busyId === a._id}
                    className="rounded-lg border border-white/10 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-white/10 disabled:opacity-50"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(a)}
                    disabled={busyId === a._id}
                    className="rounded-lg border border-red-500/30 px-4 py-2 text-xs font-bold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    🗑 Delete
                  </button>
                  {!a.isDefault && (
                    <button
                      type="button"
                      onClick={() => setDefault(a)}
                      disabled={busyId === a._id}
                      className="rounded-lg border border-blue-500/40 px-4 py-2 text-xs font-bold text-blue-300 hover:bg-blue-500/10 disabled:opacity-50"
                    >
                      ⭐ Set Default
                    </button>
                  )}
                </div>
              </div>
            ))}

            {addresses.length >= MAX_ADDRESSES && (
              <p className="text-center text-xs text-slate-500">
                You have reached the limit of {MAX_ADDRESSES} saved addresses.
              </p>
            )}
          </div>
        )}
      </div>

      {formOpen && (
        <AddressForm
          initial={editing}
          onCancel={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false);
            setMessage(editing ? "Address updated." : "Address saved.");
            load();
          }}
        />
      )}
    </main>
  );
}
