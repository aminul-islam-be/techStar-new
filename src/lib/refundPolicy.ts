/**
 * What an order cost, split into products and courier, and what comes back
 * if it is cancelled or returned. Pure maths, no database: safe in the browser.
 *
 * Policy: only the PRODUCT price is refunded. The courier charge is not,
 * because the parcel has already gone (or been paid for) with the courier.
 */

export const COURIER_NOTE =
  "The courier charge is non-refundable if the order is cancelled or the parcel is returned. Only the product price is refunded.";

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

type OrderLike = {
  items: { price: number; quantity: number }[];
  totalAmount: number;
  itemsTotal?: number;
  courierTotal?: number;
};

export function orderBreakdown(o: OrderLike) {
  const fromItems = o.items.reduce((s, i) => s + Number(i.price) * Number(i.quantity), 0);
  const productTotal = round2(o.itemsTotal ?? fromItems);
  // orders placed before courier charges existed have no courier at all
  const courier = round2(o.courierTotal ?? Math.max(0, Number(o.totalAmount) - productTotal));

  return {
    productTotal,
    courier,
    total: round2(Number(o.totalAmount)),
    refundable: productTotal, // what the customer gets back on cancel / return
  };
}

/**
 * One switch for the cancel-before-dispatch rule.
 *  false = the customer always gets the product price back only (courier is never refunded)
 *  true  = if the order is cancelled BEFORE it is sent, the courier charge is refunded too
 */
export const REFUND_COURIER_BEFORE_DISPATCH = false;

/** What the customer gets back for this cancellation / return. */
export function refundAmount(o: OrderLike, beforeDispatch: boolean) {
  const b = orderBreakdown(o);
  return REFUND_COURIER_BEFORE_DISPATCH && beforeDispatch ? round2(b.productTotal + b.courier) : b.refundable;
}
