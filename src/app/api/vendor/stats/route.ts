import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import Product from "@/models/Product";
import { getCurrentVendor, unauthorized } from "@/lib/vendorAuth";

export async function GET() {
  const vendor = await getCurrentVendor();
  if (!vendor) return unauthorized();
  await connectDB();

  const vid = new mongoose.Types.ObjectId(String(vendor._id));
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [products, pendingProducts, orderAgg, recent] = await Promise.all([
    Product.countDocuments({ vendorId: vid }),
    Product.countDocuments({ vendorId: vid, approvalStatus: "pending" }),
    Order.aggregate([
      { $match: { "items.vendorId": vid } },
      { $unwind: "$items" },
      { $match: { "items.vendorId": vid } },
      {
        $group: {
          _id: null,
          orderIds: { $addToSet: "$_id" },
          // earnings still waiting for delivery + payment
          pendingEarnings: {
            $sum: {
              $cond: [
                { $and: [{ $eq: [{ $ifNull: ["$vendorSettledAt", null] }, null] }, { $ne: ["$status", "cancelled"] }] },
                "$items.vendorEarning",
                0,
              ],
            },
          },
          monthSales: {
            $sum: {
              $cond: [
                { $and: [{ $gte: ["$createdAt", monthStart] }, { $ne: ["$status", "cancelled"] }] },
                { $multiply: ["$items.price", "$items.quantity"] },
                0,
              ],
            },
          },
        },
      },
    ]),
    Order.find({ "items.vendorId": vid }).sort({ createdAt: -1 }).limit(5).lean(),
  ]);

  const agg = orderAgg[0] || { orderIds: [], pendingEarnings: 0, monthSales: 0 };

  return NextResponse.json({
    success: true,
    stats: {
      products,
      pendingProducts,
      orders: agg.orderIds.length,
      pendingEarnings: Math.round(agg.pendingEarnings * 100) / 100,
      monthSales: Math.round(agg.monthSales * 100) / 100,
      balance: vendor.balance,
      pendingPayout: vendor.pendingPayout,
      totalSales: vendor.totalSales,
      totalEarned: vendor.totalEarned,
      totalCommission: vendor.totalCommission,
      totalWithdrawn: vendor.totalWithdrawn,
    },
    recentOrders: recent.map((o) => ({
      _id: String(o._id),
      status: o.status,
      paymentStatus: o.paymentStatus,
      createdAt: o.createdAt,
      myTotal: o.items
        .filter((i) => String(i.vendorId) === String(vendor._id))
        .reduce((s, i) => s + i.price * i.quantity, 0),
    })),
  });
}
