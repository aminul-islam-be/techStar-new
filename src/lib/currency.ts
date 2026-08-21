export type CurrencyRateMap = Record<string, number>;

export function convertFromBDT(
  amountBDT: number,
  currency: string,
  rates: CurrencyRateMap
): number {
  if (!Number.isFinite(amountBDT)) {
    return 0;
  }

  if (currency === "BDT") {
    return amountBDT;
  }

  const rate = rates[currency];

  if (!rate || !Number.isFinite(rate)) {
    return amountBDT;
  }

  return amountBDT * rate;
}

export function formatCurrency(
  amount: number,
  currency: string,
  symbol: string
): string {
  const decimals =
    currency === "JPY" ||
    currency === "KRW" ||
    currency === "VND"
      ? 0
      : 2;

  return `${symbol}${amount.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}
