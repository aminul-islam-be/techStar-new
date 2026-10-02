import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import { getCurrentVendor, unauthorized } from "@/lib/vendorAuth";

// the customer's phone and address are shown only after TechStar confirmed the order
const SHOW_CUSTOMER_FROM = ["confirmed", "processing", "shipped", "delivered"];

export async function GET() {
  const vendor = await getCurrentVendor();
  if (!vendor) return unauthorized();
  await connectDB();

  const orders = await Order.find({ "items.vendorId": vendor._id }).sort({ createdAt: -1 }).limit(200).lean();

  const rows = orders.map((o) => {
    const mine = o.items.filter((i) => String(i.vendorId) === String(vendor._id));
    const gross = mine.reduce((s, i) => s + i.price * i.quantity, 0);
    const courier = mine.reduce((s, i) => s + (i.courierCharge || 0), 0);
    const isCod = o.paymentMethod === "cod";
    const addr = o.deliveryAddress;

    return {
      _id: String(o._id),
      createdAt: o.createdAt,
      status: o.status,
      paymentStatus: o.paymentStatus,
      paymentMethod: isCod ? "cod" : "online",
      zone: o.shippingZone || "",
      // COD: this vendor collects the cash for their own parcels
      cashToCollect: isCod ? gross + courier : 0,
      settled: isCod ? Boolean(o.codCommissionAccruedAt) : Boolean(o.vendorSettledAt),
      reversed: isCod ? Boolean(o.codCommissionReversedAt) : Boolean(o.vendorReversedAt),
      customer: SHOW_CUSTOMER_FROM.includes(o.status)
        ? {
            name: addr?.fullName || o.customerName,
            phone: addr?.phone || o.customerPhone,
            address: addr?.address || "",
            area: addr?.area || "",
            city: addr?.city || "",
          }
        : null,
      items: mine.map((i) => ({
        name: i.name,
        image: i.image,
        price: i.price,
        quantity: i.quantity,
        courierCharge: i.courierCharge || 0,
        commissionAmount: i.commissionAmount || 0,
        vendorEarning: i.vendorEarning || 0,
      })),
      gross,
      courier,
      commission: mine.reduce((s, i) => s + (i.commissionAmount || 0), 0),
      earning: mine.reduce((s, i) => s + (i.vendorEarning || 0), 0),
    };
  });

  return NextResponse.json({ success: true, orders: rows });
}
