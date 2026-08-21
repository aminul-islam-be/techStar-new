"use client";

import LocationDetector from "@/components/LocationDetector";

import { useEffect, useState } from "react";
import {
  getAllCountries,
  getCountryInfo,
  DEFAULT_COUNTRY,
  LOCATION_STORAGE_KEY,
} from "@/lib/locationCurrency";

function getFlagEmoji(countryCode: string) {
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) =>
      String.fromCodePoint(127397 + char.charCodeAt(0))
    );
}

type Preferences = {
  country: string;
  currency: string;
  symbol: string;
};

export default function LocationCurrencySelector() {
  const countries = getAllCountries();

  const [open, setOpen] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>({
    country: DEFAULT_COUNTRY,
    currency: "BDT",
    symbol: "৳",
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCATION_STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved) as Preferences;

        if (parsed.country && parsed.currency && parsed.symbol) {
          setPreferences(parsed);
        }
      }
    } catch {
      // Ignore invalid saved preferences.
    }
  }, []);

  function changeCountry(code: string) {
    const info = getCountryInfo(code);

    const next: Preferences = {
      country: info.code,
      currency: info.currency,
      symbol: info.symbol,
    };

    setPreferences(next);
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(next));
    setOpen(false);

    window.dispatchEvent(
      new CustomEvent("techstar-location-change", {
        detail: next,
      })
    );
  }

  return (
    <div className="relative">
      <LocationDetector />
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.07] hover:text-white"
      >
        {preferences.symbol} {preferences.currency}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          <div
            className="absolute right-0 top-12 z-50 w-[280px] overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-white/10 px-4 py-3">
              <p className="text-sm font-bold text-white">
                Country & Currency
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Select your country manually.
              </p>
            </div>

            <div className="max-h-[360px] overflow-y-auto p-2">
              {countries.map((country) => {
                const selected =
                  country.code === preferences.country;

                return (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => changeCountry(country.code)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition ${
                      selected
                        ? "bg-blue-500/15 text-white"
                        : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 truncate text-sm font-medium">
                        <span className="text-lg leading-none">
                          {getFlagEmoji(country.code)}
                        </span>
                        <span className="truncate">
                          {country.name}
                        </span>
                      </span>

                      <span className="mt-0.5 block text-xs text-slate-500">
                        {country.currency} ({country.symbol})
                      </span>
                    </span>

                    {selected && (
                      <span className="ml-3 text-sm text-blue-400">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
