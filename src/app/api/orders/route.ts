import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Cart from "@/models/Cart";
import Order from "@/models/Order";
import User from "@/models/User";
import Product from "@/models/Product";

function getUserId(request: NextRequest) {
  return request.headers.get("x-user-id")?.trim() || "";
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const userId = getUserId(request);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Please login first.",
        },
        { status: 401 }
      );
    }

    const user = await User.findById(userId).lean();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found.",
        },
        { status: 404 }
      );
    }

    if (!user.active) {
      return NextResponse.json(
        {
          success: false,
          message: "Your account is inactive.",
        },
        { status: 403 }
      );
    }

    const cart = await Cart.findOne({ userId });

    if (!cart || !cart.items || cart.items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Your cart is empty.",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    const customerName =
      String(body.customerName || "").trim();

    const customerPhone =
      String(body.customerPhone || "").trim();

    const customerEmail =
      String(body.customerEmail || "").trim();

    const paymentMethod =
      String(body.paymentMethod || "manual").trim();

    const addressData = body.deliveryAddress || {};

    const fullName =
      String(addressData.fullName || customerName).trim();

    const phone =
      String(addressData.phone || customerPhone).trim();

    const address =
      String(addressData.address || "").trim();

    const city =
      String(addressData.city || "").trim();

    const area =
      String(addressData.area || "").trim();

    if (!customerName) {
      return NextResponse.json(
        {
          success: false,
          message: "Full name is required.",
        },
        { status: 400 }
      );
    }

    if (!customerPhone) {
      return NextResponse.json(
        {
          success: false,
          message: "Phone number is required.",
        },
        { status: 400 }
      );
    }

    if (!address) {
      return NextResponse.json(
        {
          success: false,
          message: "Delivery address is required.",
        },
        { status: 400 }
      );
    }

    if (!fullName || !phone) {
      return NextResponse.json(
        {
          success: false,
          message: "Delivery name and phone are required.",
        },
        { status: 400 }
      );
    }

    const orderItems = [];
    let totalAmount = 0;

    for (const item of cart.items) {
      const product = await Product.findById(
        item.productId
      ).lean();

      if (!product) {
        return NextResponse.json(
          {
            success: false,
            message: `${item.name} is no longer available.`,
          },
          { status: 400 }
        );
      }

      if (!product.active) {
        return NextResponse.json(
          {
            success: false,
            message: `${product.name} is currently inactive.`,
          },
          { status: 400 }
        );
      }

      if (product.stock < item.quantity) {
        return NextResponse.json(
          {
            success: false,
            message: `${product.name}: only ${product.stock} item(s) available.`,
          },
          { status: 400 }
        );
      }

      const price = Number(product.price);
      const quantity = Number(item.quantity);

      orderItems.push({
        productId: product._id,
        name: product.name,
        price,
        quantity,
        image: product.image,
      });

      totalAmount += price * quantity;
    }

    const order = await Order.create({
      userId: new mongoose.Types.ObjectId(userId),

      customerName,
      customerPhone,

      customerEmail:
        customerEmail || user.email || "",

      items: orderItems,

      totalAmount,

      currency: "BDT",

      paymentMethod:
        paymentMethod || "manual",

      paymentStatus: "pending",

      status: "pending",

      deliveryAddress: {
        fullName,
        phone,
        address,
        city,
        area,
      },
    });

    for (const item of orderItems) {
      await Product.findByIdAndUpdate(
        item.productId,
        {
          $inc: {
            stock: -item.quantity,
          },
        }
      );
    }

    cart.items = [];
    await cart.save();

    return NextResponse.json(
      {
        success: true,
        message: "Order placed successfully.",
        order: {
          id: order._id.toString(),
          totalAmount: order.totalAmount,
          status: order.status,
          paymentStatus: order.paymentStatus,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/orders error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to place order.",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const userId = getUserId(request);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Please login first.",
        },
        { status: 401 }
      );
    }

    const orders = await Order.find({
      userId,
    })
      .sort({
        createdAt: -1,
      })
      .lean();

    return NextResponse.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("GET /api/orders error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load orders.",
      },
      { status: 500 }
    );
  }
}
