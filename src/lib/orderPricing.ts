import mongoose from "mongoose";
import Product from "@/models/Product";
import Vendor from "@/models/Vendor";
import { getSettings } from "@/lib/marketplace";
import { round2, priceParcel } from "@/lib/commissionMath";
import { isDhakaDivision } from "@/lib/bdDistricts";

type RawItem = {
  productId: unknown;
  name?: unknown;
  price?: unknown;
  quantity?: unknown;
  image?: unknown;
};

/**
 * Prices a whole order on the SERVER (the browser's totals are never trusted):
 *  - every product line is one parcel and gets its own courier charge
 *    (inside Dhaka Division or outside, set by the admin)
 *  - vendor products get the commission snapshot: rate %, min / max per parcel
 *  - strips any forged vendor / commission fields sent by the browser
 */
export async function buildPricedOrder(rawItems: RawItem[], deliveryAddress?: { city?: string }) {
  const lines = rawItems
    .filter((i) => i && mongoose.Types.ObjectId.isValid(String(i.productId)))
    .map((i) => ({
      productId: String(i.productId),
      name: String(i.name || "").trim(),
      price: Number(i.price),
      quantity: Math.max(1, Math.floor(Number(i.quantity) || 1)),
      image: i.image ? String(i.image) : undefined,
    }))
    .filter((i) => i.name && Number.isFinite(i.price) && i.price >= 0);

  const empty = { items: [], itemsTotal: 0, courierTotal: 0, totalAmount: 0, zone: "outside" as "dhaka" | "outside" };
  if (!lines.length) return empty;

  const settings = await getSettings();
  const zone: "dhaka" | "outside" = isDhakaDivision(deliveryAddress?.city) ? "dhaka" : "outside";
  const courier = round2(zone === "dhaka" ? settings.courierInsideDhaka ?? 80 : settings.courierOutsideDhaka ?? 120);
  const min = settings.commissionMin ?? 10;
  const max = settings.commissionMax ?? 20;

  const products = await Product.find({
    _id: { $in: lines.map((l) => l.productId) },
    vendorId: { $exists: true, $ne: null },
  })
    .select("vendorId")
    .lean();

  const vendorByProduct = new Map(products.map((p) => [String(p._id), String(p.vendorId)]));
  const vendors = await Vendor.find({ _id: { $in: [...new Set(vendorByProduct.values())] } })
    .select("commissionRate")
    .lean();
  const rateByVendor = new Map(vendors.map((v) => [String(v._id), v.commissionRate ?? settings.defaultCommissionRate]));

  let itemsTotal = 0;
  let courierTotal = 0;

  const items = lines.map((line) => {
    const vendorId = vendorByProduct.get(line.productId);
    const p = priceParcel({
      price: line.price,
      quantity: line.quantity,
      ratePct: vendorId ? rateByVendor.get(vendorId) ?? settings.defaultCommissionRate : null,
      min,
      max,
      courier,
    });
    itemsTotal += p.gross;
    courierTotal += p.courier;

    if (!vendorId) return { ...line, courierCharge: p.courier };

    return {
      ...line,
      courierCharge: p.courier,
      vendorId,
      commissionRate: rateByVendor.get(vendorId) ?? settings.defaultCommissionRate,
      commissionAmount: p.commission,
      vendorEarning: p.vendorEarning,
    };
  });

  return {
    items,
    itemsTotal: round2(itemsTotal),
    courierTotal: round2(courierTotal),
    totalAmount: round2(itemsTotal + courierTotal),
    zone,
  };
}
