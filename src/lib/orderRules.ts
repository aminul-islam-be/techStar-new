/** Who can do what with an order, and when. Pure rules, safe in the browser and on the server. */

// the customer can cancel until the order starts being prepared / sent
export const CANCEL_STATUSES = ["pending", "confirmed"];

// after delivery the customer has this many days to ask for a return / refund / exchange
export const RETURN_WINDOW_DAYS = 7;

export const ORDER_STEPS = ["pending", "confirmed", "processing", "shipped", "delivered"] as const;

export const CANCEL_REASONS = [
  "Ordered by mistake",
  "Found a better price",
  "Delivery is taking too long",
  "Want to change the address or items",
  "Other",
];

export const REQUEST_TYPES = [
  { value: "return", label: "Return the product", hint: "Send it back, the product price is refunded." },
  { value: "refund", label: "Refund only", hint: "For example: not received, or a wrong item." },
  { value: "exchange", label: "Exchange", hint: "Swap it for the right / another item." },
] as const;

export const REQUEST_REASONS = [
  "Product is damaged or defective",
  "Wrong item received",
  "Item not as described",
  "Size / model does not fit",
  "Product not received",
  "Changed my mind",
  "Other",
];

type OrderState = { status?: string; deliveredAt?: string | Date; updatedAt?: string | Date };

export function canCancelOrder(o: OrderState) {
  return CANCEL_STATUSES.includes(o.status || "pending");
}

/** Is the return window still open? Only delivered orders can be returned. */
export function returnWindow(o: OrderState, now: number = Date.now()) {
  if (o.status !== "delivered") return { open: false, daysLeft: 0 };
  const start = new Date(o.deliveredAt || o.updatedAt || now).getTime();
  const end = start + RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return { open: now <= end, daysLeft: Math.max(0, Math.ceil((end - now) / (24 * 60 * 60 * 1000))) };
}
