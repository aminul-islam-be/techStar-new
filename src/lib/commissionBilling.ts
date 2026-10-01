import mongoose from "mongoose";
import Order from "@/models/Order";
import Vendor from "@/models/Vendor";
import CommissionLedger from "@/models/CommissionLedger";
import CommissionPayment from "@/models/CommissionPayment";
import MarketplaceSettings from "@/models/MarketplaceSettings";
import { getSettings, settleOrder, reverseOrder, groupByVendor } from "@/lib/marketplace";
import { validateSslPayment } from "@/lib/sslcommerz";
import { round2, computeAccrual, computeReversal, computePayment, lockDecision, dhakaDate } from "@/lib/commissionMath";

type Balance = { due: number; credit: number };
type Computed = Balance & { unlock?: boolean };

const orderLabel = (id: unknown) => `#${String(id).slice(-8).toUpperCase()}`;

/** Old vendors were created before these fields existed. */
async function ensureBillingFields(vendorId: string) {
  await Vendor.updateOne({ _id: vendorId, dueCommission: { $exists: false } }, { $set: { dueCommission: 0 } });
  await Vendor.updateOne({ _id: vendorId, creditBalance: { $exists: false } }, { $set: { creditBalance: 0 } });
}

/**
 * Changes a vendor's due / credit safely when several things happen at once
 * (two orders delivered together, a payment arriving at the same moment...).
 * The write only succeeds if nobody changed the balance since we read it,
 * otherwise it reads again and recalculates.
 */
async function adjustBalance<T extends Computed>(vendorId: string, compute: (b: Balance) => T) {
  await ensureBillingFields(vendorId);

  for (let attempt = 0; attempt < 8; attempt++) {
    const v = await Vendor.findById(vendorId).select("dueCommission creditBalance").lean();
    if (!v) return null;

    const before: Balance = { due: v.dueCommission ?? 0, credit: v.creditBalance ?? 0 };
    const result = compute(before);

    const update: Record<string, unknown> = { $set: { dueCommission: result.due, creditBalance: result.credit } };
    if (result.unlock) {
      (update.$set as Record<string, unknown>).billingLocked = false;
      update.$unset = { billingLockedAt: "" };
    }

    const updated = await Vendor.findOneAndUpdate(
      { _id: vendorId, dueCommission: before.due, creditBalance: before.credit },
      update,
      { returnDocument: "after" }
    );
    if (updated) return { before, result };
  }
  throw new Error("Could not update the vendor balance (too many changes at the same time). Try again.");
}

async function writeLedger(entry: Record<string, unknown>) {
  try {
    await CommissionLedger.create({ month: dhakaDate().month, ...entry });
  } catch (error) {
    console.error("Commission ledger write failed:", error);
  }
}

/** COD order delivered -> the vendor owes TechStar the commission. */
export async function accrueCodCommission(orderId: string) {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, paymentMethod: "cod", status: "delivered", codCommissionAccruedAt: null },
    { $set: { codCommissionAccruedAt: new Date() } },
    { returnDocument: "after" }
  ).lean();
  if (!order) return false;

  let done = 0;
  try {
    for (const [vendorId, t] of groupByVendor(order.items as never)) {
      const commission = round2(t.commission);
      if (commission <= 0) continue;

      const r = await adjustBalance(vendorId, (b) => computeAccrual(b, commission));
      if (!r) continue;
      done++;

      await writeLedger({
        vendorId,
        type: "accrual",
        amount: commission,
        creditUsed: r.result.creditUsed,
        orderId: order._id,
        dueAfter: r.result.due,
        creditAfter: r.result.credit,
        note: `COD order ${orderLabel(order._id)} delivered`,
      });
    }
    return true;
  } catch (error) {
    // nothing was charged yet: let the next status change try again
    if (!done) await Order.updateOne({ _id: orderId }, { $unset: { codCommissionAccruedAt: "" } });
    throw error;
  }
}

/** COD order returned / cancelled after delivery -> the commission is taken back. */
export async function reverseCodCommission(orderId: string) {
  const order = await Order.findOneAndUpdate(
    {
      _id: orderId,
      paymentMethod: "cod",
      status: "cancelled",
      codCommissionAccruedAt: { $ne: null },
      codCommissionReversedAt: null,
    },
    { $set: { codCommissionReversedAt: new Date() } },
    { returnDocument: "after" }
  ).lean();
  if (!order) return false;

  for (const [vendorId, t] of groupByVendor(order.items as never)) {
    const commission = round2(t.commission);
    if (commission <= 0) continue;

    const r = await adjustBalance(vendorId, (b) => computeReversal(b, commission));
    if (!r) continue;

    await writeLedger({
      vendorId,
      type: "reversal",
      amount: commission,
      orderId: order._id,
      dueAfter: r.result.due,
      creditAfter: r.result.credit,
      note: `COD order ${orderLabel(order._id)} returned`,
    });
  }
  return true;
}

/** One entry point for the admin order screen: COD -> commission due, online -> wallet. */
export async function settleAnyOrder(orderId: string) {
  const o = await Order.findById(orderId).select("paymentMethod").lean();
  if (!o) return false;
  return o.paymentMethod === "cod" ? accrueCodCommission(orderId) : settleOrder(orderId);
}

export async function reverseAnyOrder(orderId: string) {
  const online = await reverseOrder(orderId);
  const cod = await reverseCodCommission(orderId);
  return online || cod;
}

/**
 * The vendor paid `amount`. Clears the due first; anything extra is kept as
 * advance credit. When the due reaches zero the shop is unlocked.
 */
export async function applyVendorPayment(args: { vendorId: string; amount: number; paymentId?: unknown; note?: string }) {
  const amount = round2(args.amount);
  const r = await adjustBalance(args.vendorId, (b) => {
    const p = computePayment(b, amount);
    return { ...p, unlock: p.due <= 0 };
  });
  if (!r) throw new Error("Vendor not found.");

  await writeLedger({
    vendorId: args.vendorId,
    type: "payment",
    amount,
    paymentId: args.paymentId,
    dueAfter: r.result.due,
    creditAfter: r.result.credit,
    note: args.note || "Commission payment",
  });

  return { dueAfter: r.result.due, creditAfter: r.result.credit, unlocked: r.result.due <= 0 };
}

/** Records a payment the admin received outside the gateway (e.g. direct bKash). */
export async function recordManualPayment(vendorId: string, amount: number, ref: string) {
  const id = new mongoose.Types.ObjectId();
  await CommissionPayment.create({
    _id: id,
    vendorId,
    amount,
    status: "paid",
    gateway: "manual",
    tranId: `MANUAL${id.toString()}`,
    gatewayRef: ref,
    paidAt: new Date(),
    note: "Recorded by admin",
  });
  return applyVendorPayment({ vendorId, amount, paymentId: id, note: `Received by admin (${ref})` });
}

/**
 * Called by the gateway redirect AND by the gateway's server-to-server IPN.
 * It asks SSLCommerz whether the money really arrived, checks the amount, and
 * applies it exactly once, even if both calls arrive together.
 */
export async function finalizeGatewayPayment(tranId: string, valId: string) {
  const payment = await CommissionPayment.findOne({ tranId });
  if (!payment) return { ok: false, reason: "Payment not found." };
  if (payment.status === "paid") return { ok: true, already: true };

  const v = await validateSslPayment(valId);
  if (!v || !["VALID", "VALIDATED"].includes(String(v.status))) {
    return { ok: false, reason: "The gateway did not confirm this payment." };
  }
  if (v.tran_id !== tranId) return { ok: false, reason: "Payment reference does not match." };
  if (Math.abs(Number(v.amount) - payment.amount) > 0.01) return { ok: false, reason: "Paid amount does not match." };
  if ((v.currency_type || v.currency || "BDT") !== "BDT") return { ok: false, reason: "Unexpected currency." };
  if (String(v.risk_level) === "1") return { ok: false, reason: "The gateway flagged this payment as risky. Support will review it." };

  // only one caller can win this step
  const claimed = await CommissionPayment.findOneAndUpdate(
    { _id: payment._id, status: "pending" },
    { $set: { status: "paid", gatewayRef: v.bank_tran_id || valId, paidAt: new Date() } },
    { returnDocument: "after" }
  );
  if (!claimed) return { ok: true, already: true };

  try {
    await applyVendorPayment({
      vendorId: String(payment.vendorId),
      amount: payment.amount,
      paymentId: payment._id,
      note: `Online payment (${v.card_type || "gateway"})`,
    });
  } catch (error) {
    await CommissionPayment.updateOne({ _id: payment._id }, { $set: { status: "pending" } });
    throw error;
  }
  return { ok: true };
}

/**
 * The monthly job. Locks every vendor who still owes commission.
 * Safe to call every day: it only acts once per month (on the lock day, or
 * the next day it runs if a run was missed). `force` = admin "run now".
 */
export async function runCommissionLock(opts: { force?: boolean } = {}) {
  const settings = await getSettings();
  const now = new Date();
  const month = dhakaDate(now).month;

  if (!opts.force) {
    const decision = lockDecision({ now, graceDays: settings.commissionGraceDays ?? 0, lastRunMonth: settings.lastLockRunMonth });
    if (decision === "skip") return { action: "skipped", month, locked: 0 };

    // only one run per month, even if the cron fires twice
    const claimed = await MarketplaceSettings.findOneAndUpdate(
      { key: "main", lastLockRunMonth: { $ne: month } },
      { $set: { lastLockRunMonth: month, lastLockRunAt: now } }
    );
    if (!claimed) return { action: "skipped", month, locked: 0 };

    // very first run: just remember the month, nobody owes "last month" yet
    if (decision === "initialize") return { action: "initialized", month, locked: 0 };
  } else {
    await MarketplaceSettings.updateOne({ key: "main" }, { $set: { lastLockRunMonth: month, lastLockRunAt: now } });
  }

  const res = await Vendor.updateMany(
    { dueCommission: { $gt: 0 }, billingLocked: { $ne: true } },
    { $set: { billingLocked: true, billingLockedAt: now } }
  );
  return { action: "locked", month, locked: res.modifiedCount };
}
