import mongoose from "mongoose";
import Notification from "@/models/Notification";
import StockAlert from "@/models/StockAlert";
import Product from "@/models/Product";

export type NotifyType = "order" | "offer" | "stock" | "product";

type Payload = {
  type: NotifyType;
  title: string;
  message: string;
  icon?: string;
  link?: string;
  dedupeKey?: string;
};

/** Accepts an id string, an ObjectId, or a populated document ({ _id }). */
function idOf(value: unknown): string {
  if (value && typeof value === "object" && "_id" in value) {
    return String((value as { _id: unknown })._id);
  }
  return String(value || "");
}

export function orderLabel(orderId: unknown) {
  return `#${idOf(orderId).slice(-8).toUpperCase()}`;
}

/** Creates one notification. It NEVER throws: a failed notification must not break an order. */
export async function notifyUser(userId: unknown, payload: Payload) {
  try {
    const id = idOf(userId);
    if (!mongoose.Types.ObjectId.isValid(id)) return;

    const userObjectId = new mongoose.Types.ObjectId(id);
    const doc = {
      userId: userObjectId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      icon: payload.icon,
      link: payload.link,
      isRead: false,
    };

    if (payload.dedupeKey) {
      await Notification.updateOne(
        { userId: userObjectId, dedupeKey: payload.dedupeKey },
        { $setOnInsert: { ...doc, dedupeKey: payload.dedupeKey } },
        { upsert: true }
      );
    } else {
      await Notification.create(doc);
    }
  } catch (error) {
    console.error("notifyUser error:", error);
  }
}

/** Sends the same notification to many customers (offers). Returns how many were created. */
export async function notifyMany(
  userIds: unknown[],
  payload: Omit<Payload, "dedupeKey">
) {
  let created = 0;

  const ids = [...new Set(userIds.map(idOf))].filter((id) =>
    mongoose.Types.ObjectId.isValid(id)
  );

  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500).map((id) => ({
      userId: new mongoose.Types.ObjectId(id),
      type: payload.type,
      title: payload.title,
      message: payload.message,
      icon: payload.icon,
      link: payload.link,
      isRead: false,
    }));

    try {
      const result = await Notification.insertMany(chunk, { ordered: false });
      created += result.length;
    } catch (error) {
      console.error("notifyMany chunk error:", error);
    }
  }

  return created;
}

/* ------------------------------ orders ------------------------------ */

const ORDER_TEXT: Record<
  string,
  { icon: string; title: string; message: (n: string) => string }
> = {
  confirmed: {
    icon: "🔔",
    title: "Order Confirmed",
    message: (n) => `Your order ${n} has been confirmed.`,
  },
  processing: {
    icon: "⚙️",
    title: "Order Processing",
    message: (n) => `We are preparing your order ${n}.`,
  },
  shipped: {
    icon: "🚚",
    title: "Order Shipped",
    message: (n) => `Your order ${n} is on the way.`,
  },
  delivered: {
    icon: "✅",
    title: "Order Delivered",
    message: (n) =>
      `Your order ${n} has been delivered. Tap to rate your products.`,
  },
  cancelled: {
    icon: "❌",
    title: "Order Cancelled",
    message: (n) => `Your order ${n} has been cancelled.`,
  },
};

export async function notifyOrderPlaced(orderId: unknown, userId: unknown) {
  await notifyUser(userId, {
    type: "order",
    icon: "🛒",
    title: "Order Placed",
    message: `We received your order ${orderLabel(orderId)}. We will confirm it soon.`,
    link: `/orders/${idOf(orderId)}`,
    dedupeKey: `order:${idOf(orderId)}:placed`,
  });
}

export async function notifyOrderStatus(
  orderId: unknown,
  userId: unknown,
  status: string
) {
  const text = ORDER_TEXT[status];
  if (!text) return; // "pending" etc. need no message

  await notifyUser(userId, {
    type: "order",
    icon: text.icon,
    title: text.title,
    message: text.message(orderLabel(orderId)),
    link: `/orders/${idOf(orderId)}`,
    dedupeKey: `order:${idOf(orderId)}:${status}`,
  });
}

export async function notifyPaymentReceived(orderId: unknown, userId: unknown) {
  await notifyUser(userId, {
    type: "order",
    icon: "💳",
    title: "Payment Received",
    message: `Payment for order ${orderLabel(orderId)} was received. Thank you!`,
    link: `/orders/${idOf(orderId)}`,
    dedupeKey: `order:${idOf(orderId)}:paid`,
  });
}

/* --------------------- return / refund / exchange --------------------- */

export async function notifyRequestUpdate(
  request: { _id: unknown; orderId: unknown; userId: unknown; type: string },
  status: "approved" | "rejected" | "completed",
  note?: string
) {
  const n = orderLabel(request.orderId);
  const kind = request.type;

  const text = {
    approved: {
      icon: "👍",
      title: `${cap(kind)} Request Approved`,
      message: `Your ${kind} request for order ${n} was approved.`,
    },
    rejected: {
      icon: "⚠️",
      title: `${cap(kind)} Request Rejected`,
      message: `Your ${kind} request for order ${n} was not approved.${
        note ? ` Reason: ${note}` : ""
      }`,
    },
    completed: {
      icon: "✅",
      title: `${cap(kind)} Completed`,
      message: `Your ${kind} request for order ${n} is completed.`,
    },
  }[status];

  await notifyUser(request.userId, {
    type: "order",
    ...text,
    link: `/orders/${idOf(request.orderId)}`,
    dedupeKey: `request:${idOf(request._id)}:${status}`,
  });
}

function cap(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/* ------------------------------ stock ------------------------------ */

/**
 * Call after a product's stock was changed. If the product is available now,
 * every logged-in customer who asked "notify me" gets a notification (once).
 */
export async function notifyBackInStock(productId: unknown) {
  try {
    const id = idOf(productId);
    if (!mongoose.Types.ObjectId.isValid(id)) return 0;

    const product = await Product.findById(id)
      .select("name slug stock active")
      .lean();

    if (!product || !product.active || !(Number(product.stock) > 0)) return 0;

    const alerts = await StockAlert.find({
      productId: id,
      notified: false,
      userId: { $exists: true, $ne: null },
    })
      .select("userId")
      .lean();

    if (!alerts.length) return 0;

    const userIds = [...new Set(alerts.map((a) => String(a.userId)))];

    const sent = await notifyMany(userIds, {
      type: "stock",
      icon: "📦",
      title: "Back in Stock",
      message: `${product.name} is available again. Order before it sells out!`,
      link: `/products/${product.slug}`,
    });

    await StockAlert.updateMany(
      { _id: { $in: alerts.map((a) => a._id) } },
      { $set: { notified: true } }
    );

    return sent;
  } catch (error) {
    console.error("notifyBackInStock error:", error);
    return 0;
  }
}
