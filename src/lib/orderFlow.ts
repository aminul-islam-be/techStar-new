import mongoose from "mongoose";
import Product from "@/models/Product";
import Order from "@/models/Order";
import Cart from "@/models/Cart";
import OrderRequest from "@/models/OrderRequest";
import { releaseCouponForOrder } from "@/lib/couponRules";
import { settleOrder } from "@/lib/marketplace";
import { notifyPaymentReceived } from "@/lib/notify";
import { validateSslPayment, isPaidSslResult } from "@/lib/sslcommerz";
import { refundAmount } from "@/lib/refundPolicy";

type Id = string | mongoose.Types.ObjectId;
export type StockLine = { productId: Id; quantity: number };

/* ---------- stock ---------- */

/** Takes the stock of every line. All or nothing: if one line fails, the others are given back. */
export async function reserveStock(lines: StockLine[]) {
  const taken: StockLine[] = [];
  for (const line of lines) {
    const res = await Product.updateOne(
      { _id: line.productId, active: true, stock: { $gte: line.quantity } },
      { $inc: { stock: -line.quantity } }
    );
    if (res.matchedCount !== 1) {
      await giveBackStock(taken);
      return false;
    }
    taken.push(line);
  }
  return true;
}

/** Puts the stock back. */
export async function giveBackStock(lines: StockLine[]) {
  for (const line of lines) {
    await Product.updateOne({ _id: line.productId }, { $inc: { stock: line.quantity } });
  }
}

/** A cancelled order gives its stock back. Only once, however many times this runs. */
export async function releaseOrderStock(orderId: Id) {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, stockReserved: true, stockReleasedAt: null },
    { $set: { stockReleasedAt: new Date() } },
    { returnDocument: "after" }
  ).lean();
  if (!order) return false;
  await giveBackStock(order.items.map((i) => ({ productId: i.productId, quantity: i.quantity })));
  return true;
}

/* ---------- cancel ---------- */

/** Cancels an online order that is still unpaid, and gives back its stock and its coupon use. */
export async function cancelUnpaidOrder(orderId: Id, reason: string) {
  const order = await Order.findOneAndUpdate(
    {
      _id: orderId,
      paymentMethod: "sslcommerz",
      paymentStatus: { $ne: "paid" },
      status: { $in: ["pending", "confirmed"] },
    },
    {
      $set: {
        status: "cancelled",
        paymentStatus: "failed",
        cancelledAt: new Date(),
        cancelReason: reason.slice(0, 200),
        cancelledBy: "customer",
      },
    },
    { returnDocument: "after" }
  ).lean();
  if (!order) return false;

  await releaseOrderStock(order._id);
  await releaseCouponForOrder(order._id);
  return true;
}

/** The gateway says the payment failed or was cancelled. Found by the transaction id. */
export async function cancelUnpaidOrderByTran(tranId: string, reason: string) {
  const order = await Order.findOne({ paymentTranIds: tranId }).select("_id").lean();
  if (!order) return false;
  return cancelUnpaidOrder(order._id, reason);
}

/**
 * Unpaid online orders hold stock. Free them when the same customer starts a new
 * order, and after 30 minutes for everybody else.
 */
export async function releaseStaleOnlineOrders(userId: string) {
  try {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000);
    const stale = await Order.find({
      paymentMethod: "sslcommerz",
      paymentStatus: { $ne: "paid" },
      status: "pending",
      stockReserved: true,
      $or: [{ userId }, { createdAt: { $lt: cutoff } }],
    })
      .select("_id")
      .lean();

    for (const o of stale) {
      await cancelUnpaidOrder(o._id, "Payment was not completed in time");
    }
  } catch (error) {
    console.error("releaseStaleOnlineOrders error:", error);
  }
}

/* ---------- cart ---------- */

/** Removes only the bought products from the saved cart. Newer items stay. */
export async function removeOrderItemsFromCart(userId: Id, items: { productId: Id }[]) {
  const ids = items.map((i) => new mongoose.Types.ObjectId(String(i.productId)));
  await Cart.updateOne({ userId }, { $pull: { items: { productId: { $in: ids } } } });
}

/* ---------- online payment confirmation (used by the success page AND the IPN) ---------- */

/**
 * Marks an online order as paid, but ONLY after SSLCommerz confirms the payment
 * (transaction id, amount and currency). Safe to run twice: the payment is claimed once.
 */
export async function confirmOnlinePayment(tranId: string, valId: string) {
  const order = await Order.findOne({ paymentTranIds: tranId }).lean();
  if (!order) return { ok: false as const, message: "Order not found for this payment." };
  if (order.paymentStatus === "paid") return { ok: true as const, message: "Already paid." };

  const check = await validateSslPayment(valId);
  if (!isPaidSslResult(check, tranId, order.totalAmount)) {
    return { ok: false as const, message: "SSLCommerz could not confirm this payment." };
  }

  // only one request can claim this payment
  const claimed = await Order.findOneAndUpdate(
    { _id: order._id, paymentStatus: { $ne: "paid" } },
    {
      $set: {
        paymentStatus: "paid",
        paidAt: new Date(),
        paymentValId: valId,
        bankTranId: String(check?.bank_tran_id || ""),
      },
    },
    { returnDocument: "after" }
  ).lean();
  if (!claimed) return { ok: true as const, message: "Already paid." };

  // Money came in for an order that was already cancelled (the customer paid after
  // the 30-minute window or started a new checkout). Admin must refund it.
  if (claimed.status === "cancelled") {
    await OrderRequest.create({
      orderId: claimed._id,
      userId: claimed.userId,
      type: "refund",
      auto: true,
      reason: "Paid after the order was cancelled",
      details: `SSLCommerz transaction ${tranId}`,
      amount: refundAmount(claimed as never, true),
    });
    return { ok: true as const, message: "Payment received for a cancelled order. A refund is requested." };
  }

  await removeOrderItemsFromCart(claimed.userId, claimed.items);
  try {
    await settleOrder(String(claimed._id));
  } catch (error) {
    console.error("Settlement error:", error);
  }
  try {
    await notifyPaymentReceived(claimed._id, claimed.userId);
  } catch (error) {
    console.error("Payment notification error:", error);
  }
  return { ok: true as const, message: "Payment confirmed." };
}
