import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getAdminSession } from "@/lib/adminAuth";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import { SHIPMENT_STATUSES, shippedQuantities, type ShipmentStatus } from "@/lib/shipments";

function fail(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

/**
 * Admin: estimated delivery date, shipments (partial delivery) and courier / tracking.
 * Body: { action: "setEstimate" | "addShipment" | "updateShipment" | "deleteShipment", ... }
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession("orders"))) {
    return NextResponse.json({ success: false, message: "Admin login required." }, { status: 401 });
  }
  try {
    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return fail("Invalid order ID.");

    const body = await request.json().catch(() => ({}));
    const order = await Order.findById(id).lean();
    if (!order) return fail("Order not found.", 404);
    if (order.status === "cancelled") return fail("A cancelled order can not be shipped.", 409);

    if (body.action === "setEstimate") {
      const raw = String(body.estimatedDeliveryDate || "").trim();
      if (!raw) {
        await Order.updateOne({ _id: id }, { $unset: { estimatedDeliveryDate: 1 } });
      } else {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return fail("Use the date format YYYY-MM-DD.");
        // Bangladesh time (UTC+6): the day picked here is the day the customer sees
        await Order.updateOne({ _id: id }, { $set: { estimatedDeliveryDate: new Date(`${raw}T00:00:00+06:00`) } });
      }
    } else if (body.action === "addShipment") {
      const wanted = new Map<string, number>();
      for (const line of Array.isArray(body.items) ? body.items : []) {
        const productId = String(line?.productId || "");
        const qty = Math.floor(Number(line?.quantity));
        if (qty > 0) wanted.set(productId, (wanted.get(productId) || 0) + qty);
      }

      const sent = shippedQuantities(order.shipments);
      const shipItems: { productId: mongoose.Types.ObjectId; name: string; quantity: number }[] = [];
      for (const [productId, quantity] of wanted) {
        const item = order.items.find((i) => String(i.productId) === productId);
        if (!item) return fail("A selected product is not part of this order.");
        const left = item.quantity - (sent.get(productId) || 0);
        if (quantity > left) return fail(`${item.name}: only ${left} left to ship.`);
        shipItems.push({ productId: item.productId, name: item.name, quantity });
      }
      if (shipItems.length === 0) return fail("Pick at least one product and a quantity.");

      await Order.updateOne(
        { _id: id },
        {
          $push: {
            shipments: {
              items: shipItems,
              courierName: String(body.courierName || "").trim().slice(0, 60),
              trackingNumber: String(body.trackingNumber || "").trim().slice(0, 60),
              status: "preparing",
              createdAt: new Date(),
            },
          },
        }
      );
    } else if (body.action === "updateShipment") {
      const shipmentId = String(body.shipmentId || "");
      const current = (order.shipments || []).find((s) => String(s._id) === shipmentId);
      if (!current) return fail("Shipment not found.", 404);

      const set: Record<string, unknown> = {};
      if (body.courierName !== undefined) set["shipments.$.courierName"] = String(body.courierName).trim().slice(0, 60);
      if (body.trackingNumber !== undefined) set["shipments.$.trackingNumber"] = String(body.trackingNumber).trim().slice(0, 60);
      if (body.status !== undefined) {
        const next = String(body.status) as ShipmentStatus;
        if (!SHIPMENT_STATUSES.includes(next)) return fail("Invalid shipment status.");
        if (SHIPMENT_STATUSES.indexOf(next) < SHIPMENT_STATUSES.indexOf(current.status)) {
          return fail("A shipment can not go back to an earlier status.", 409);
        }
        set["shipments.$.status"] = next;
        if (next !== "preparing" && !current.shippedAt) set["shipments.$.shippedAt"] = new Date();
        if (next === "delivered") set["shipments.$.deliveredAt"] = new Date();
      }
      if (Object.keys(set).length === 0) return fail("Nothing to update.");
      await Order.updateOne({ _id: id, "shipments._id": current._id }, { $set: set });
    } else if (body.action === "deleteShipment") {
      const shipmentId = String(body.shipmentId || "");
      const current = (order.shipments || []).find((s) => String(s._id) === shipmentId);
      if (!current) return fail("Shipment not found.", 404);
      if (current.status !== "preparing") return fail("Only a shipment that is still being prepared can be deleted.", 409);
      await Order.updateOne({ _id: id }, { $pull: { shipments: { _id: current._id } } });
    } else {
      return fail("Unknown action.");
    }

    const fresh = await Order.findById(id).lean();
    return NextResponse.json({ success: true, message: "Saved.", order: fresh });
  } catch (error) {
    console.error("PATCH admin order delivery error:", error);
    return NextResponse.json({ success: false, message: "Unable to save delivery details." }, { status: 500 });
  }
}
