/**
 * SSLCommerz helpers for vendor commission payments.
 * Keys come from the environment, never from source code:
 *   SSLCOMMERZ_STORE_ID, SSLCOMMERZ_STORE_PASSWORD, SSLCOMMERZ_IS_LIVE ("true" for the real gateway)
 * bKash, Nagad, Rocket and cards are all offered on the SSLCommerz payment page.
 */

const HOSTS = {
  sandbox: "https://sandbox.sslcommerz.com",
  live: "https://securepay.sslcommerz.com",
};

export function sslConfig() {
  const storeId = process.env.SSLCOMMERZ_STORE_ID;
  const storePass = process.env.SSLCOMMERZ_STORE_PASSWORD;
  if (!storeId || !storePass) return null;
  return { storeId, storePass, host: process.env.SSLCOMMERZ_IS_LIVE === "true" ? HOSTS.live : HOSTS.sandbox };
}

/** Public address of the site (the gateway sends the vendor back here). */
export function getBaseUrl(request: Request) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || (host?.startsWith("localhost") ? "http" : "https");
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

export async function createSslSession(p: {
  tranId: string;
  amount: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  baseUrl: string;
  siteName?: string;
}) {
  const cfg = sslConfig();
  if (!cfg) return { ok: false as const, message: "Payment gateway is not configured yet. Please contact support." };

  const body = new URLSearchParams({
    store_id: cfg.storeId,
    store_passwd: cfg.storePass,
    total_amount: p.amount.toFixed(2),
    currency: "BDT",
    tran_id: p.tranId,
    success_url: `${p.baseUrl}/api/vendor/billing/callback/success`,
    fail_url: `${p.baseUrl}/api/vendor/billing/callback/fail`,
    cancel_url: `${p.baseUrl}/api/vendor/billing/callback/cancel`,
    ipn_url: `${p.baseUrl}/api/vendor/billing/ipn`,
    cus_name: p.name || "Vendor",
    cus_email: p.email || "vendor@techstar.local",
    cus_add1: p.address || "Dhaka",
    cus_city: "Dhaka",
    cus_country: "Bangladesh",
    cus_phone: p.phone || "01700000000",
    shipping_method: "NO",
    product_name: `${p.siteName || "Marketplace"} COD commission`,
    product_category: "Service",
    product_profile: "non-physical-goods",
  });

  const res = await fetch(`${cfg.host}/gwprocess/v4/api.php`, { method: "POST", body });
  const data = await res.json().catch(() => null);

  if (data?.status === "SUCCESS" && data.GatewayPageURL) return { ok: true as const, gatewayUrl: String(data.GatewayPageURL) };
  return { ok: false as const, message: String(data?.failedreason || "Could not open the payment page.") };
}

/** Asks SSLCommerz directly whether a payment is real. Never trust the browser's POST alone. */
export async function validateSslPayment(valId: string) {
  const cfg = sslConfig();
  if (!cfg || !valId) return null;
  const url = `${cfg.host}/validator/api/validationserverAPI.php?val_id=${encodeURIComponent(valId)}&store_id=${encodeURIComponent(
    cfg.storeId
  )}&store_passwd=${encodeURIComponent(cfg.storePass)}&format=json`;
  const res = await fetch(url, { cache: "no-store" });
  return res.ok ? ((await res.json().catch(() => null)) as Record<string, string> | null) : null;
}
