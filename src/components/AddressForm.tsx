"use client";

import { useState } from "react";
import { getCustomerUser } from "@/lib/customerAuth";
import { DISTRICTS, DIVISIONS } from "@/lib/bdDistricts";

export type SavedAddress = {
  _id: string;
  title: string;
  name: string;
  phone: string;
  address: string;
  area: string;
  city: string;
  division: string;
  country: string;
  isDefault: boolean;
};

const TITLES = [
  { value: "Home", icon: "🏠" },
  { value: "Office", icon: "🏢" },
  { value: "Other", icon: "📍" },
];

export function titleIcon(title: string) {
  return TITLES.find((t) => t.value === title)?.icon || "📍";
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500";

/**
 * Add / edit address in a pop-up. Used by the My Addresses page and by checkout.
 * It saves to the server itself and then calls onSaved(address).
 */
export default function AddressForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: SavedAddress | null;
  onSaved: (address: SavedAddress) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title || "Home");
  const [name, setName] = useState(
    () => initial?.name ?? getCustomerUser()?.fullName ?? ""
  );
  const [phone, setPhone] = useState(
    () => initial?.phone ?? getCustomerUser()?.phone ?? ""
  );
  const [city, setCity] = useState(initial?.city || "");
  const [area, setArea] = useState(initial?.area || "");
  const [address, setAddress] = useState(initial?.address || "");
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      const response = await fetch(
        initial ? `/api/addresses/${initial._id}` : "/api/addresses",
        {
          method: initial ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            name,
            phone,
            city,
            area,
            address,
            isDefault,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to save address.");
      }

      onSaved(data.address);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save address.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
      <form
        onSubmit={save}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-slate-900 p-5 text-white sm:rounded-3xl sm:p-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold">
            {initial ? "Edit Address" : "Add New Address"}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="rounded-lg px-2 py-1 text-xl text-slate-400 hover:bg-white/10 hover:text-white"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            ⚠️ {error}
          </div>
        )}

        <div className="mt-5">
          <p className="mb-2 text-sm font-semibold">Address type</p>
          <div className="grid grid-cols-3 gap-2">
            {TITLES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTitle(t.value)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                  title === t.value
                    ? "border-blue-500 bg-blue-500/15 text-white"
                    : "border-white/10 text-slate-400 hover:border-white/25"
                }`}
              >
                {t.icon} {t.value}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold">
              Receiver name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="017XXXXXXXX"
              inputMode="tel"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">District</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={inputClass}
            >
              <option value="">Select district</option>
              {DIVISIONS.map((division) => (
                <optgroup key={division} label={`${division} Division`}>
                  {DISTRICTS.filter((d) => d.division === division).map((d) => (
                    <option key={d.name} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Area / Thana
            </label>
            <input
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="e.g. Panchlaish"
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-semibold">
              Full address
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              placeholder="House, road, village / locality"
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>

        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={isDefault}
            disabled={Boolean(initial?.isDefault)}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="h-4 w-4 accent-blue-500"
          />
          Set as my default address
        </label>

        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? "Saving..." : initial ? "Save Changes" : "Save Address"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-slate-300 hover:bg-white/5"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
