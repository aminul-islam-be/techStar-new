import mongoose from "mongoose";
import Product from "@/models/Product";
import Order from "@/models/Order";
import Vendor from "@/models/Vendor";
import VendorTransaction from "@/models/VendorTransaction";
import MarketplaceSettings from "@/models/MarketplaceSettings";

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export async function getSettings() {
  return MarketplaceSettings.findOneAndUpdate(
    { key: "main" },
    { $setOnInsert: { key: "main" } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
}

type RawItem = {
  productId: unknown;
  name?: unknown;
  price?: unknown;
  quantity?: unknown;
  image?: unknown;
};

/**
 * Cleans cart items coming from the browser (so nobody can forge vendor or
 * commission fields) and attaches the vendor + commission split for
 * marketplace products. Admin-owned products are left without a vendor.
 */
export async function buildOrderItems(rawItems: RawItem[]) {
  const items = rawItems
    .filter((i) => i && mongoose.Types.ObjectId.isValid(String(i.productId)))
    .map((i) => ({
      productId: String(i.productId),
      name: String(i.name || "").trim(),
      price: Number(i.price),
      quantity: Math.max(1, Math.floor(Number(i.quantity) || 1)),
      image: i.image ? String(i.image) : undefined,
    }))
    .filter((i) => i.name && Number.isFinite(i.price) && i.price >= 0);

  if (!items.length) return [];

  const products = await Product.find({
    _id: { $in: items.map((i) => i.productId) },
    vendorId: { $exists: true, $ne: null },
  })
    .select("vendorId")
    .lean();

  const vendorByProduct = new Map(products.map((p) => [String(p._id), String(p.vendorId)]));
  const vendorIds = [...new Set(vendorByProduct.values())];

  const [vendors, settings] = await Promise.all([
    Vendor.find({ _id: { $in: vendorIds } }).select("commissionRate").lean(),
    getSettings(),
  ]);
  const rateByVendor = new Map(
    vendors.map((v) => [String(v._id), v.commissionRate ?? settings.defaultCommissionRate])
  );

  return items.map((item) => {
    const vendorId = vendorByProduct.get(item.productId);
    if (!vendorId) return item;

    const rate = rateByVendor.get(vendorId) ?? settings.defaultCommissionRate;
    const gross = round2(item.price * item.quantity);
    const commissionAmount = round2((gross * rate) / 100);

    return {
      ...item,
      vendorId,
      commissionRate: rate,
      commissionAmount,
      vendorEarning: round2(gross - commissionAmount),
    };
  });
}

type SplitItem = {
  vendorId?: unknown;
  price: number;
  quantity: number;
  commissionAmount?: number;
  vendorEarning?: number;
};

function groupByVendor(items: SplitItem[]) {
  const map = new Map<string, { gross: number; commission: number; net: number }>();
  for (const item of items) {
    if (!item.vendorId) continue;
    const key = String(item.vendorId);
    const row = map.get(key) || { gross: 0, commission: 0, net: 0 };
    row.gross += item.price * item.quantity;
    row.commission += item.commissionAmount || 0;
    row.net += item.vendorEarning || 0;
    map.set(key, row);
  }
  return map;
}

/**
 * Credits vendors for a delivered + paid order. Safe to call many times:
 * the order is "claimed" atomically, so money is never added twice.
 */
export async function settleOrder(orderId: string) {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, status: "delivered", paymentStatus: "paid", vendorSettledAt: null },
    { $set: { vendorSettledAt: new Date() } },
    { new: true }
  ).lean();

  if (!order) return false;

  try {
    for (const [vendorId, t] of groupByVendor(order.items as SplitItem[])) {
      const gross = round2(t.gross);
      const commission = round2(t.commission);
      const net = round2(t.net);

      const vendor = await Vendor.findByIdAndUpdate(
        vendorId,
        {
          $inc: {
            balance: net,
            totalSales: gross,
            totalCommission: commission,
            totalEarned: net,
          },
        },
        { new: true }
      );
      if (!vendor) continue;

      await VendorTransaction.create({
        vendorId,
        type: "sale",
        amount: net,
        grossAmount: gross,
        commissionRate: gross > 0 ? round2((commission / gross) * 100) : 0,
        commissionAmount: commission,
        orderId: order._id,
        balanceAfter: vendor.balance,
        note: `Order #${String(order._id).slice(-8).toUpperCase()}`,
      });
    }
    return true;
  } catch (error) {
    // Release the claim so the next status update can retry.
    await Order.updateOne({ _id: orderId }, { $unset: { vendorSettledAt: "" } });
    throw error;
  }
}

/**
 * If an already-settled order is cancelled/refunded, take the vendor's
 * share back (balance can go negative and is recovered from future sales).
 */
export async function reverseOrder(orderId: string) {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, status: "cancelled", vendorSettledAt: { $ne: null }, vendorReversedAt: null },
    { $set: { vendorReversedAt: new Date() } },
    { new: true }
  ).lean();

  if (!order) return false;

  for (const [vendorId, t] of groupByVendor(order.items as SplitItem[])) {
    const gross = round2(t.gross);
    const commission = round2(t.commission);
    const net = round2(t.net);

    const vendor = await Vendor.findByIdAndUpdate(
      vendorId,
      {
        $inc: {
          balance: -net,
          totalSales: -gross,
          totalCommission: -commission,
          totalEarned: -net,
        },
      },
      { new: true }
    );
    if (!vendor) continue;

    await VendorTransaction.create({
      vendorId,
      type: "reversal",
      amount: -net,
      grossAmount: gross,
      commissionAmount: commission,
      orderId: order._id,
      balanceAfter: vendor.balance,
      note: `Cancelled order #${String(order._id).slice(-8).toUpperCase()}`,
    });
  }
  return true;
}
