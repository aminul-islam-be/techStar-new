import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import OrderRequest from "@/models/OrderRequest";
import Product from "@/models/Product";
import { getSiteSettings } from "@/lib/siteSettings";
import { canCancelOrder, returnWindow } from "@/lib/orderRules";
import { orderBreakdown } from "@/lib/refundPolicy";

/** Everything the customer's order page needs: items, sellers, requests and what they may do. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const userId = request.headers.get("x-user-id")?.trim() || "";

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid Order ID." }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ success: false, message: "Please login to see this order.", redirectToLogin: true }, { status: 401 });
    }

    // a customer can only open THEIR OWN orders
    const order = await Order.findOne({ _id: id, userId }).lean();
    if (!order) return NextResponse.json({ success: false, message: "Order not found." }, { status: 404 });

    const [products, requests, site] = await Promise.all([
      Product.find({ _id: { $in: order.items.map((i) => i.productId) } })
        .select("slug vendorId vendorName active stock")
        .lean(),
      OrderRequest.find({ orderId: order._id }).sort({ createdAt: -1 }).lean(),
      getSiteSettings(),
    ]);
    const byId = new Map(products.map((p) => [String(p._id), p]));

    const items = order.items.map((i) => {
      const p = byId.get(String(i.productId));
      return {
        productId: String(i.productId),
        name: i.name,
        image: i.image,
        price: i.price,
        quantity: i.quantity,
        courierCharge: i.courierCharge || 0,
        slug: p?.slug || "",
        available: Boolean(p && p.active && p.stock > 0),
        sellerKey: p?.vendorId ? String(p.vendorId) : "platform",
        sellerName: p?.vendorId ? p.vendorName || "Seller" : site.siteName,
      };
    });

    // one entry per seller, so "Contact seller" knows who to open a chat with
    const sellers = [...new Map(items.filter((i) => i.slug).map((i) => [i.sellerKey, { key: i.sellerKey, name: i.sellerName, slug: i.slug }])).values()];

    const win = returnWindow(order);
    const openRequest = requests.some((r) => !r.auto && ["pending", "approved"].includes(r.status));

    return NextResponse.json({
      success: true,
      order: { ...order, _id: String(order._id), items },
      sellers,
      requests: requests.map((r) => ({ ...r, _id: String(r._id) })),
      breakdown: orderBreakdown(order as never),
      can: {
        cancel: canCancelOrder(order),
        request: win.open && !openRequest,
        requestWindowDays: win.daysLeft,
        hasOpenRequest: openRequest,
      },
    });
  } catch (error) {
    console.error("GET /api/orders/[id]/details error:", error);
    return NextResponse.json({ success: false, message: "Server error." }, { status: 500 });
  }
}
