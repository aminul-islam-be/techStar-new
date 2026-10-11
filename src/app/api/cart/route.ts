import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Cart from "@/models/Cart";
import Product from "@/models/Product";
import { getSessionUserId } from "@/lib/userSession";

/** The logged-in customer, from the signed cookie. Returns "" when not logged in. */
async function currentUserId() {
  const id = await getSessionUserId();
  return mongoose.Types.ObjectId.isValid(id) ? id : "";
}

const loginRequired = () =>
  NextResponse.json({ success: false, message: "Please login to use your cart." }, { status: 401 });

export async function GET() {
  try {
    await connectDB();
    const userId = await currentUserId();
    if (!userId) return loginRequired();

    const cart = await Cart.findOne({ userId }).lean();
    if (!cart || !cart.items.length) {
      return NextResponse.json({ success: true, cart: cart || { userId, items: [] } });
    }

    // name, price and image come from the product NOW, so the cart shows what the server will charge
    const products = await Product.find({ _id: { $in: cart.items.map((i) => i.productId) } })
      .select("name price image stock active")
      .lean();
    const byId = new Map(products.map((p) => [String(p._id), p]));

    const items = cart.items.map((item) => {
      const p = byId.get(String(item.productId));
      if (!p) return { ...item, unavailable: true };
      return { ...item, name: p.name, price: p.price, image: p.image, stock: p.stock, unavailable: !p.active };
    });

    return NextResponse.json({ success: true, cart: { ...cart, items } });
  } catch (error) {
    console.error("GET cart error:", error);
    return NextResponse.json({ success: false, message: "Unable to load cart." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const userId = await currentUserId();
    if (!userId) return loginRequired();

    const body = await request.json().catch(() => ({}));
    const productId = String(body.productId || "");
    const quantity = Number(body.quantity || 1);

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return NextResponse.json({ success: false, message: "Valid product ID is required." }, { status: 400 });
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      return NextResponse.json({ success: false, message: "Quantity must be at least 1." }, { status: 400 });
    }

    const product = await Product.findById(productId).lean();
    if (!product) {
      return NextResponse.json({ success: false, message: "Product not found." }, { status: 404 });
    }
    if (!product.active) {
      return NextResponse.json({ success: false, message: "This product is currently inactive." }, { status: 400 });
    }

    const cart = (await Cart.findOne({ userId })) || new Cart({ userId, items: [] });
    const index = cart.items.findIndex((item) => String(item.productId) === productId);
    const newQuantity = index > -1 ? cart.items[index].quantity + quantity : quantity;

    if (newQuantity > product.stock) {
      return NextResponse.json({ success: false, message: `Only ${product.stock} items are available.` }, { status: 400 });
    }

    const line = {
      productId: new mongoose.Types.ObjectId(productId),
      name: product.name,
      price: product.price,
      quantity: newQuantity,
      image: product.image,
    };
    if (index > -1) cart.items[index] = line;
    else cart.items.push(line);

    await cart.save();
    return NextResponse.json({ success: true, message: "Product added to cart.", cart });
  } catch (error) {
    console.error("POST cart error:", error);
    return NextResponse.json({ success: false, message: "Unable to add product to cart." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectDB();
    const userId = await currentUserId();
    if (!userId) return loginRequired();

    const body = await request.json().catch(() => ({}));
    const productId = String(body.productId || "");
    const quantity = Number(body.quantity);

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return NextResponse.json({ success: false, message: "Valid product ID is required." }, { status: 400 });
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      return NextResponse.json({ success: false, message: "Quantity must be at least 1." }, { status: 400 });
    }

    const product = await Product.findById(productId).lean();
    if (!product) return NextResponse.json({ success: false, message: "Product not found." }, { status: 404 });
    if (quantity > product.stock) {
      return NextResponse.json({ success: false, message: `Only ${product.stock} items are available.` }, { status: 400 });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) return NextResponse.json({ success: false, message: "Cart not found." }, { status: 404 });

    const item = cart.items.find((cartItem) => String(cartItem.productId) === productId);
    if (!item) return NextResponse.json({ success: false, message: "Product is not in the cart." }, { status: 404 });

    item.quantity = quantity;
    item.price = product.price;
    item.name = product.name;
    item.image = product.image;

    await cart.save();
    return NextResponse.json({ success: true, message: "Cart updated successfully.", cart });
  } catch (error) {
    console.error("PATCH cart error:", error);
    return NextResponse.json({ success: false, message: "Unable to update cart." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const userId = await currentUserId();
    if (!userId) return loginRequired();

    const productId = new URL(request.url).searchParams.get("productId")?.trim() || "";

    if (productId) {
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return NextResponse.json({ success: false, message: "Invalid product ID." }, { status: 400 });
      }

      const cart = await Cart.findOne({ userId });
      if (!cart) return NextResponse.json({ success: true, message: "Cart is already empty.", cart: { userId, items: [] } });
      cart.items = cart.items.filter((item) => String(item.productId) !== productId) as typeof cart.items;
      await cart.save();

      return NextResponse.json({ success: true, message: "Product removed from cart.", cart });
    }

    await Cart.findOneAndDelete({ userId });
    return NextResponse.json({ success: true, message: "Cart cleared successfully.", cart: { userId, items: [] } });
  } catch (error) {
    console.error("DELETE cart error:", error);
    return NextResponse.json({ success: false, message: "Unable to update cart." }, { status: 500 });
  }
}
