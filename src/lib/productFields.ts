import Product from "@/models/Product";

export const BRAND_MAX_LENGTH = 60;
export const SKU_MAX_LENGTH = 40;

/** "  Sony   TV " → "Sony TV" (keeps the letters the shop typed) */
export function cleanBrand(raw: unknown): string {
  return String(raw ?? "").replace(/\s+/g, " ").trim().slice(0, BRAND_MAX_LENGTH);
}

/** A SKU is a product code: letters, digits, "-" and "_", up to 40 characters. Empty = no SKU. */
export function cleanSku(raw: unknown): { sku: string; error: string } {
  const sku = String(raw ?? "").trim().toUpperCase();
  if (sku === "") return { sku: "", error: "" };
  if (sku.length > SKU_MAX_LENGTH || !/^[A-Z0-9][A-Z0-9_-]*$/.test(sku)) {
    return { sku: "", error: "SKU can use only letters, numbers, - and _ (up to 40 characters)." };
  }
  return { sku, error: "" };
}

/** True when another product already uses this SKU. exceptId = the product being edited. */
export async function skuTaken(sku: string, exceptId?: string): Promise<boolean> {
  if (!sku) return false;
  const filter: Record<string, unknown> = { sku };
  if (exceptId) filter._id = { $ne: exceptId };
  return Boolean(await Product.exists(filter));
}
