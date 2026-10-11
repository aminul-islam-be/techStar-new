import mongoose from "mongoose";
import Product from "@/models/Product";
import Vendor from "@/models/Vendor";
import { getSettings } from "@/lib/marketplace";
import { round2, priceParcel } from "@/lib/commissionMath";
import { isDhakaDivision } from "@/lib/bdDistricts";

export type PricedLine = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  courierCharge: number;
  vendorId?: string;
  commissionRate?: number;
  commissionAmount?: number;
  vendorEarning?: number;
};

export type PricedOrder =
  | { ok: true; items: PricedLine[]; itemsTotal: number; courierTotal: number; totalAmount: number; zone: "dhaka" | "outside" }
  | { ok: false; message: string };

/**
 * Prices a whole order on the SERVER.
 * The browser only sends product ids and quantities. Name, price, image, stock and
 * active flag are always read from the database, so a price changed in the browser
 * has no effect.
 */
export async function buildPricedOrder(
  rawItems: { productId?: unknown; quantity?: unknown }[],
  deliveryAddress?: { city?: string }
): Promise<PricedOrder> {
  // merge duplicate lines of one product, and skip bad ids
  const qtyByProduct = new Map<string, number>();
  for (const raw of rawItems) {
    const id = String(raw?.productId ?? "");
    if (!mongoose.Types.ObjectId.isValid(id)) continue;
    const qty = Math.max(1, Math.floor(Number(raw?.quantity) || 1));
    qtyByProduct.set(id, (qtyByProduct.get(id) || 0) + qty);
  }
  if (!qtyByProduct.size) return { ok: false, message: "Your cart has no valid items." };

  const products = await Product.find({ _id: { $in: [...qtyByProduct.keys()] } })
    .select("name price image stock active vendorId")
    .lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));

  for (const [id, qty] of qtyByProduct) {
    const p = byId.get(id);
    if (!p || !p.active) {
      return { ok: false, message: "A product in your cart is no longer available. Please review your cart." };
    }
    if (p.stock < qty) {
      return { ok: false, message: `Only ${p.stock} of "${p.name}" left in stock. Please update your cart.` };
    }
  }

  const settings = await getSettings();
  const zone: "dhaka" | "outside" = isDhakaDivision(deliveryAddress?.city) ? "dhaka" : "outside";
  const courier = round2(zone === "dhaka" ? settings.courierInsideDhaka ?? 80 : settings.courierOutsideDhaka ?? 120);
  const min = settings.commissionMin ?? 10;
  const max = settings.commissionMax ?? 20;

  const vendorIds = [...new Set(products.filter((p) => p.vendorId).map((p) => String(p.vendorId)))];
  const vendors = await Vendor.find({ _id: { $in: vendorIds } }).select("commissionRate").lean();
  const rateByVendor = new Map(vendors.map((v) => [String(v._id), v.commissionRate ?? settings.defaultCommissionRate]));

  let itemsTotal = 0;
  let courierTotal = 0;
  const items: PricedLine[] = [];

  for (const [id, qty] of qtyByProduct) {
    const p = byId.get(id);
    const vendorId = p.vendorId ? String(p.vendorId) : undefined;
    const rate = vendorId ? rateByVendor.get(vendorId) ?? settings.defaultCommissionRate : null;
    const parcel = priceParcel({ price: Number(p.price), quantity: qty, ratePct: rate, min, max, courier });

    itemsTotal += parcel.gross;
    courierTotal += parcel.courier;
    items.push({
      productId: id,
      name: p.name,
      price: Number(p.price),
      quantity: qty,
      image: p.image || undefined,
      courierCharge: parcel.courier,
      ...(vendorId ? { vendorId, commissionRate: rate ?? 0, commissionAmount: parcel.commission, vendorEarning: parcel.vendorEarning } : {}),
    });
  }

  itemsTotal = round2(itemsTotal);
  courierTotal = round2(courierTotal);
  return { ok: true, items, itemsTotal, courierTotal, totalAmount: round2(itemsTotal + courierTotal), zone };
}
