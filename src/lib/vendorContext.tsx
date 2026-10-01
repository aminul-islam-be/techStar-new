"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type VendorProfile = {
  _id: string;
  shopName: string;
  ownerName: string;
  phone: string;
  email?: string;
  address?: string;
  description?: string;
  logo?: string;
  status: "pending" | "approved" | "suspended" | "rejected";
  effectiveCommissionRate: number;
  payoutMethod?: { type: "bkash" | "nagad" | "rocket" | "bank"; accountName: string; accountNumber: string; bankName?: string };
  dueCommission?: number;
  creditBalance?: number;
  billingLocked?: boolean;
};

type VendorCtx = {
  vendor: VendorProfile | null;
  minWithdrawal: number;
  graceDays: number;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<VendorCtx>({
  vendor: null,
  minWithdrawal: 0,
  graceDays: 0,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
});

export const useVendor = () => useContext(Ctx);

export const money = (n: number | undefined | null) =>
  "৳" + Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });

export function VendorProvider({ children }: { children: ReactNode }) {
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [minWithdrawal, setMin] = useState(0);
  const [graceDays, setGraceDays] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/vendor/me", { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.success) {
        setVendor(data.vendor);
        setMin(data.minWithdrawal || 0);
        setGraceDays(data.commissionGraceDays || 0);
      } else {
        setVendor(null);
      }
    } catch {
      setVendor(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/vendor/logout", { method: "POST" });
    setVendor(null);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return <Ctx.Provider value={{ vendor, minWithdrawal, graceDays, loading, refresh, logout }}>{children}</Ctx.Provider>;
}
