import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import Product from "@/models/Product";
import User from "@/models/User";

export async function GET() {
  try {
    await connectDB();

    // --- Basic counts ---
    const [totalOrders, totalCustomers, totalProducts] = await Promise.all([
      Order.countDocuments({}),
      User.countDocuments({ role: "customer" }),
      Product.countDocuments({ active: true }),
    ]);

    // --- Revenue (paid orders only) ---
    const revenueAgg = await Order.aggregate([
      { $match: { paymentStatus: "paid" } },
      { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" }, paidOrders: { $sum: 1 } } },
    ]);
    const totalRevenue = revenueAgg[0]?.totalRevenue || 0;
    const paidOrders = revenueAgg[0]?.paidOrders || 0;

    // --- Orders grouped by status ---
    const statusAgg = await Order.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const statusOrder = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
    const ordersByStatus = statusOrder.map((status) => ({
      status,
      count: statusAgg.find((s) => s._id === status)?.count || 0,
    }));

    // --- Monthly sales trend (last 6 months, paid orders) ---
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyAgg = await Order.aggregate([
      { $match: { paymentStatus: "paid", createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          revenue: { $sum: "$totalAmount" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlySales: { label: string; revenue: number; orders: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(sixMonthsAgo);
      d.setMonth(d.getMonth() + i);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const match = monthlyAgg.find((m) => m._id.year === year && m._id.month === month);
      monthlySales.push({
        label: `${monthNames[month - 1]} ${String(year).slice(2)}`,
        revenue: match?.revenue || 0,
        orders: match?.orders || 0,
      });
    }

    // --- Best-selling products (by quantity sold, non-cancelled orders) ---
    const bestSellersAgg = await Order.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          name: { $first: "$items.name" },
          image: { $first: "$items.image" },
          quantitySold: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
        },
      },
      { $sort: { quantitySold: -1 } },
      { $limit: 5 },
    ]);

    // --- Low stock products ---
    const lowStockProducts = await Product.find({ active: true, stock: { $lte: 5 } })
      .select("name slug stock category")
      .sort({ stock: 1 })
      .limit(10)
      .lean();

    return NextResponse.json({
      success: true,
      totals: {
        totalRevenue,
        totalOrders,
        paidOrders,
        totalCustomers,
        totalProducts,
      },
      ordersByStatus,
      monthlySales,
      bestSellers: bestSellersAgg,
      lowStockProducts,
    });
  } catch (error) {
    console.error("GET admin analytics error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to load analytics." },
      { status: 500 }
    );
  }
}
