"use client";

import { shippedQuantities } from "@/lib/shipments";

export type DeliveryShipment = {
  _id?: string;
  courierName?: string;
  trackingNumber?: string;
  status: "preparing" | "shipped" | "delivered";
  shippedAt?: string;
  deliveredAt?: string;
  items: { productId: string; name: string; quantity: number }[];
};

export type DeliveryOrder = {
  status: string;
  estimatedDeliveryDate?: string;
  deliveryInstructions?: string;
  shipments?: DeliveryShipment[];
  items: { productId?: string; name: string; quantity: number }[];
};

const STATUS_LABEL: Record<DeliveryShipment["status"], string> = {
  preparing: "Preparing",
  shipped: "On the way",
  delivered: "Delivered",
};

const STATUS_STYLE: Record<DeliveryShipment["status"], string> = {
  preparing: "bg-slate-500/20 text-slate-200",
  shipped: "bg-amber-500/20 text-amber-300",
  delivered: "bg-emerald-500/20 text-emerald-300",
};

function dateText(value?: string) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Dhaka",
  });
}

/** Delivery details of one order: estimate, note, shipments and what is still at the shop. */
export default function OrderDeliveryPanel({
  order,
  showInstructions = false,
}: {
  order: DeliveryOrder;
  showInstructions?: boolean;
}) {
  const shipments = order.shipments || [];
  const delivered = order.status === "delivered";
  if (order.status === "cancelled" || (delivered && shipments.length === 0)) return null;

  const sent = shippedQuantities(shipments);
  const notSent = order.items
    .map((item) => ({
      key: `${item.productId}-${item.name}`,
      name: item.name,
      left: item.quantity - (sent.get(String(item.productId)) || 0),
    }))
    .filter((item) => item.left > 0);

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900 p-4 text-sm">
      <h2 className="font-bold">Delivery</h2>

      {!delivered && order.estimatedDeliveryDate && (
        <p className="mt-2 text-slate-200">
          Estimated delivery: <b>{dateText(order.estimatedDeliveryDate)}</b>
        </p>
      )}
      {showInstructions && order.deliveryInstructions && (
        <p className="mt-2 text-xs text-slate-400">Your note: {order.deliveryInstructions}</p>
      )}
      {shipments.length === 0 && (
        <p className="mt-2 text-xs text-slate-400">
          Your order is being prepared. Courier and tracking details will appear here when it is shipped.
        </p>
      )}

      <div className="mt-3 space-y-3">
        {shipments.map((shipment, index) => (
          <div key={shipment._id || index} className="rounded-xl bg-slate-950 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">Shipment {index + 1}</p>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLE[shipment.status]}`}>
                {STATUS_LABEL[shipment.status]}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-300">Courier: {shipment.courierName || "Not added yet"}</p>
            <p className="text-xs text-slate-300">Tracking number: {shipment.trackingNumber || "Not added yet"}</p>
            <ul className="mt-2 space-y-0.5 text-xs text-slate-400">
              {shipment.items.map((item) => (
                <li key={`${item.productId}-${item.name}`}>
                  {item.name} × {item.quantity}
                </li>
              ))}
            </ul>
            {shipment.shippedAt && <p className="mt-1 text-[11px] text-slate-500">Shipped {dateText(shipment.shippedAt)}</p>}
            {shipment.deliveredAt && <p className="text-[11px] text-slate-500">Delivered {dateText(shipment.deliveredAt)}</p>}
          </div>
        ))}
      </div>

      {shipments.length > 0 && !delivered && notSent.length > 0 && (
        <div className="mt-3 rounded-xl bg-slate-950 p-3 text-xs text-slate-400">
          <p className="font-semibold text-slate-300">Still to ship</p>
          {notSent.map((item) => (
            <p key={item.key}>
              {item.name} × {item.left}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
