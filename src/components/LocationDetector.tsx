"use client";

import { useEffect } from "react";
import {
  DEFAULT_COUNTRY,
  LOCATION_STORAGE_KEY,
  getCountryInfo,
} from "@/lib/locationCurrency";

export default function LocationDetector() {
  useEffect(() => {
    const saved = localStorage.getItem(LOCATION_STORAGE_KEY);

    if (saved) return;

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=3&addressdetails=1`,
            {
              headers: {
                Accept: "application/json",
              },
            }
          );

          if (!response.ok) return;

          const data = await response.json();
          const code = data?.address?.country_code?.toUpperCase();

          if (!code) return;

          const info = getCountryInfo(code);

          const preferences = {
            country: info.code,
            currency: info.currency,
            symbol: info.symbol,
          };

          localStorage.setItem(
            LOCATION_STORAGE_KEY,
            JSON.stringify(preferences)
          );

          window.dispatchEvent(
            new CustomEvent("techstar-location-change", {
              detail: preferences,
            })
          );
        } catch {
          // Keep the default/manual country selection.
        }
      },
      () => {
        // User denied location permission.
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 86400000,
      }
    );
  }, []);

  return null;
}
