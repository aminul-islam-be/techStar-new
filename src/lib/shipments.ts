/** Shipment statuses. A shipment only moves forward: preparing → shipped → delivered. */
export const SHIPMENT_STATUSES = ["preparing", "shipped", "delivered"] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

/**
 * Default delivery estimate for new orders, in days after the order is placed.
 * Change these two numbers to match your real delivery times.
 */
export const DHAKA_DELIVERY_DAYS = 2;
export const OUTSIDE_DELIVERY_DAYS = 4;

export function estimateDelivery(zone?: string, from: Date = new Date()): Date {
  const days = zone === "dhaka" ? DHAKA_DELIVERY_DAYS : OUTSIDE_DELIVERY_DAYS;
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

/** How many of each product already left the shop in a shipment. Key = product id. */
export function shippedQuantities(shipments?: { items: { productId: unknown; quantity: number }[] }[]) {
  const sent = new Map<string, number>();
  for (const shipment of shipments || []) {
    for (const item of shipment.items) {
      const key = String(item.productId);
      sent.set(key, (sent.get(key) || 0) + item.quantity);
    }
  }
  return sent;
}
