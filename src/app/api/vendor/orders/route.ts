import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import { getCurrentVendor, unauthorized } from "@/lib/vendorAuth";

export async function GET() {
  const vendor = await getCurrentVendor();
  if (!vendor) return unauthorized();
  await connectDB();

  const orders = await Order.find({ "items.vendorId": vendor._id }).sort({ createdAt: -1 }).limit(200).lean();

  // Each vendor only sees their own items. Customer contact details stay
  // private (the platform handles delivery), only the city/area is shown.
  const rows = orders.map((o) => {
    const mine = o.items.filter((i) => String(i.vendorId) === String(vendor._id));
    return {
      _id: String(o._id),
      createdAt: o.createdAt,
      status: o.status,
      paymentStatus: o.paymentStatus,
      settled: Boolean(o.vendorSettledAt),
      reversed: Boolean(o.vendorReversedAt),
      deliverTo: [o.deliveryAddress?.area, o.deliveryAddress?.city].filter(Boolean).join(", "),
      items: mine.map((i) => ({
        name: i.name,
        image: i.image,
        price: i.price,
        quantity: i.quantity,
        commissionRate: i.commissionRate,
        commissionAmount: i.commissionAmount,
        vendorEarning: i.vendorEarning,
      })),
      gross: mine.reduce((s, i) => s + i.price * i.quantity, 0),
      commission: mine.reduce((s, i) => s + (i.commissionAmount || 0), 0),
      earning: mine.reduce((s, i) => s + (i.vendorEarning || 0), 0),
    };
  });

  return NextResponse.json({ success: true, orders: rows });
}
