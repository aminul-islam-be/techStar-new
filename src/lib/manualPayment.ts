/**
 * Send money (manual payment): bKash, Nagad or Rocket "Send Money" to the shop's number,
 * then the customer types the TrxID. Browser-safe: no database imports here.
 */

export const MANUAL_METHODS = ["bkash", "nagad", "rocket"] as const;
export type ManualMethod = (typeof MANUAL_METHODS)[number];

export const MANUAL_METHOD_LABEL: Record<ManualMethod, string> = {
  bkash: "bKash",
  nagad: "Nagad",
  rocket: "Rocket",
};

/** The three send-money numbers set in Admin → Website settings. Empty = not offered. */
export type ManualNumbers = { paymentBkash: string; paymentNagad: string; paymentRocket: string };

export function manualNumber(numbers: ManualNumbers, method: ManualMethod): string {
  if (method === "bkash") return numbers.paymentBkash;
  if (method === "nagad") return numbers.paymentNagad;
  return numbers.paymentRocket;
}

/** Only the methods that have a number are shown to customers. */
export function configuredManualMethods(numbers: ManualNumbers): ManualMethod[] {
  return MANUAL_METHODS.filter((method) => manualNumber(numbers, method) !== "");
}

export function manualMethodLabel(method: string): string {
  return MANUAL_METHOD_LABEL[method as ManualMethod] || method;
}

/** "8n7a 6b5c" → "8N7A6B5C" */
export function cleanTrxId(raw: string): string {
  return String(raw || "").replace(/\s+/g, "").toUpperCase();
}

/** bKash, Nagad and Rocket transaction IDs: letters and digits, 6 to 20 long. */
export function isValidTrxId(trxId: string): boolean {
  return /^[A-Z0-9]{6,20}$/.test(trxId);
}

/** "017 1234-5678" → "01712345678" */
export function cleanPhone(raw: string): string {
  return String(raw || "").replace(/[\s-]/g, "");
}

/** A Bangladeshi mobile number: 11 digits, starting 01 then 3 to 9. */
export function isValidBdMobile(phone: string): boolean {
  return /^01[3-9]\d{8}$/.test(phone);
}
