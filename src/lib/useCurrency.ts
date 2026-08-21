"use client";

import { useEffect, useState } from "react";
import {
  LOCATION_STORAGE_KEY,
  DEFAULT_CURRENCY,
  DEFAULT_CURRENCY_SYMBOL,
} from "@/lib/locationCurrency";
import {
  convertFromBDT,
  formatCurrency,
  CurrencyRateMap,
} from "@/lib/currency";

type CurrencyPreference = {
  country: string;
  currency: string;
  symbol: string;
};

const DEFAULT_PREFERENCE: CurrencyPreference = {
  country: "BD",
  currency: DEFAULT_CURRENCY,
  symbol: DEFAULT_CURRENCY_SYMBOL,
};

export function useCurrency() {
  const [preference, setPreference] =
    useState<CurrencyPreference>(DEFAULT_PREFERENCE);

  const [rates, setRates] = useState<CurrencyRateMap>({
    BDT: 1,
  });

  useEffect(() => {
    function readPreference() {
      try {
        const saved = localStorage.getItem(
          LOCATION_STORAGE_KEY
        );

        if (!saved) {
          setPreference(DEFAULT_PREFERENCE);
          return;
        }

        const parsed = JSON.parse(saved);

        if (
          parsed?.country &&
          parsed?.currency &&
          parsed?.symbol
        ) {
          setPreference({
            country: parsed.country,
            currency: parsed.currency,
            symbol: parsed.symbol,
          });
        }
      } catch {
        setPreference(DEFAULT_PREFERENCE);
      }
    }

    readPreference();

    function handleLocationChange(event: Event) {
      const customEvent =
        event as CustomEvent<CurrencyPreference>;

      if (
        customEvent.detail?.country &&
        customEvent.detail?.currency &&
        customEvent.detail?.symbol
      ) {
        setPreference(customEvent.detail);
      }
    }

    window.addEventListener(
      "techstar-location-change",
      handleLocationChange
    );

    return () => {
      window.removeEventListener(
        "techstar-location-change",
        handleLocationChange
      );
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadRates() {
      try {
        const response = await fetch(
          "/api/currency/rates",
          {
            cache: "no-store",
          }
        );

        if (!response.ok) return;

        const data = await response.json();

        if (
          !cancelled &&
          data.success &&
          data.rates
        ) {
          setRates({
            BDT: 1,
            ...data.rates,
          });
        }
      } catch (error) {
        console.error(
          "Unable to load currency rates:",
          error
        );
      }
    }

    loadRates();

    return () => {
      cancelled = true;
    };
  }, []);

  function convert(amountBDT: number) {
    return convertFromBDT(
      amountBDT,
      preference.currency,
      rates
    );
  }

  function format(amountBDT: number) {
    return formatCurrency(
      convert(amountBDT),
      preference.currency,
      preference.symbol
    );
  }

  return {
    country: preference.country,
    currency: preference.currency,
    symbol: preference.symbol,
    rates,
    convert,
    format,
  };
}
