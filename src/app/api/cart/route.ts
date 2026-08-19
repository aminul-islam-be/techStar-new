import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Cart from "@/models/Cart";
import Product from "@/models/Product";

function getUserId(request: NextRequest) {
  return request.headers.get("x-user-id")?.trim() || "";
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const userId = getUserId(request);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        {
          success: false,
          message: "User ID is required.",
        },
        { status: 401 }
      );
    }

    const cart = await Cart.findOne({ userId }).lean();

    return NextResponse.json({
      success: true,
      cart: cart || {
        userId,
        items: [],
      },
    });
  } catch (error) {
    console.error("GET cart error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load cart.",
      },
      { status: 500 }
    );
  }
}
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const userId = getUserId(request);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        {
          success: false,
          message: "User ID is required.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const productId = body.productId;
    const quantity = Number(body.quantity || 1);

    if (
      !productId ||
      !mongoose.Types.ObjectId.isValid(productId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid product ID is required.",
        },
        { status: 400 }
      );
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Quantity must be at least 1.",
        },
        { status: 400 }
      );
    }

    const product = await Product.findById(productId).lean();

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message: "Product not found.",
        },
        { status: 404 }
      );
    }

    if (!product.active) {
      return NextResponse.json(
        {
          success: false,
          message: "This product is currently inactive.",
        },
        { status: 400 }
      );
    }

    if (product.stock < quantity) {
      return NextResponse.json(
        {
          success: false,
          message: `Only ${product.stock} items are available.`,
        },
        { status: 400 }
      );
    }

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({
        userId,
        items: [],
      });
    }

    const existingItem = cart.items.find(
      (item) =>
        item.productId.toString() === productId
    );

    if (existingItem) {
      const newQuantity =
        existingItem.quantity + quantity;

      if (newQuantity > product.stock) {
        return NextResponse.json(
          {
            success: false,
            message: `Only ${product.stock} items are available.`,
          },
          { status: 400 }
        );
      }

      existingItem.quantity = newQuantity;
      existingItem.price = product.price;
      existingItem.name = product.name;
      existingItem.image = product.image;
    } else {
      cart.items.push({
        productId: new mongoose.Types.ObjectId(productId),
        name: product.name,
        price: product.price,
        quantity,
        image: product.image,
      });
    }

    await cart.save();

    return NextResponse.json({
      success: true,
      message: "Product added to cart.",
      cart,
    });
  } catch (error) {
    console.error("POST cart error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to add product to cart.",
      },
      { status: 500 }
    );
  }
}
export async function PATCH(request: NextRequest) {
  try {
    await connectDB();

    const userId = getUserId(request);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        {
          success: false,
          message: "User ID is required.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const productId = body.productId;
    const quantity = Number(body.quantity);

    if (
      !productId ||
      !mongoose.Types.ObjectId.isValid(productId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid product ID is required.",
        },
        { status: 400 }
      );
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Quantity must be at least 1.",
        },
        { status: 400 }
      );
    }

    const product = await Product.findById(productId).lean();

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message: "Product not found.",
        },
        { status: 404 }
      );
    }

    if (quantity > product.stock) {
      return NextResponse.json(
        {
          success: false,
          message: `Only ${product.stock} items are available.`,
        },
        { status: 400 }
      );
    }

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return NextResponse.json(
        {
          success: false,
          message: "Cart not found.",
        },
        { status: 404 }
      );
    }

    const item = cart.items.find(
      (cartItem) =>
        cartItem.productId.toString() === productId
    );

    if (!item) {
      return NextResponse.json(
        {
          success: false,
          message: "Product is not in the cart.",
        },
        { status: 404 }
      );
    }

    item.quantity = quantity;
    item.price = product.price;
    item.name = product.name;
    item.image = product.image;

    await cart.save();

    return NextResponse.json({
      success: true,
      message: "Cart updated successfully.",
      cart,
    });
  } catch (error) {
    console.error("PATCH cart error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to update cart.",
      },
      { status: 500 }
    );
  }
}
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();

    const userId = getUserId(request);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        {
          success: false,
          message: "User ID is required.",
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const productId =
      searchParams.get("productId")?.trim() || "";

    if (productId) {
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid product ID.",
          },
          { status: 400 }
        );
      }

      const cart = await Cart.findOne({ userId });

      if (!cart) {
        return NextResponse.json({
          success: true,
          message: "Cart is already empty.",
          cart: {
            userId,
            items: [],
          },
        });
      }

      cart.items = cart.items.filter(
        (item) =>
          item.productId.toString() !== productId
      );

      await cart.save();

      return NextResponse.json({
        success: true,
        message: "Product removed from cart.",
        cart,
      });
    }

    await Cart.findOneAndDelete({ userId });

    return NextResponse.json({
      success: true,
      message: "Cart cleared successfully.",
      cart: {
        userId,
        items: [],
      },
    });
  } catch (error) {
    console.error("DELETE cart error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to update cart.",
      },
      { status: 500 }
    );
  }
}

