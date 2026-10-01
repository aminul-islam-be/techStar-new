import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Vendor from "@/models/Vendor";
import Payout from "@/models/Payout";
import VendorTransaction from "@/models/VendorTransaction";
import { getAdminSession } from "@/lib/adminAuth";

const noAuth = () => NextResponse.json({ success: false, message: "Admin login required." }, { status: 401 });

export async function GET(request: NextRequest) {
  if (!(await getAdminSession())) return noAuth();
  await connectDB();

  const status = new URL(request.url).searchParams.get("status") || "pending";
  const filter: Record<string, unknown> = ["pending", "paid", "rejected"].includes(status) ? { status } : {};

  const payouts = await Payout.find(filter)
    .populate("vendorId", "shopName ownerName phone")
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  return NextResponse.json({ success: true, payouts });
}

/** action "paid": you sent the money (enter bKash/bank transaction id). action "reject": money goes back to the vendor wallet. */
export async function PATCH(request: NextRequest) {
  if (!(await getAdminSession())) return noAuth();
  await connectDB();

  const { id, action, transactionRef, adminNote } = await request.json();
  if (!id || !mongoose.Types.ObjectId.isValid(id) || !["paid", "reject"].includes(action)) {
    return NextResponse.json({ success: false, message: "Payout id and a valid action are required." }, { status: 400 });
  }
  if (action === "paid" && !String(transactionRef || "").trim()) {
    return NextResponse.json({ success: false, message: "Enter the transaction ID you paid with." }, { status: 400 });
  }

  // Claim the payout atomically so it can't be processed twice.
  const payout = await Payout.findOneAndUpdate(
    { _id: id, status: "pending" },
    {
      $set: {
        status: action === "paid" ? "paid" : "rejected",
        transactionRef: String(transactionRef || "").trim(),
        adminNote: String(adminNote || "").trim(),
        processedAt: new Date(),
      },
    },
    { new: true }
  );
  if (!payout) {
    return NextResponse.json({ success: false, message: "Payout not found or already processed." }, { status: 404 });
  }

  if (action === "paid") {
    await Vendor.updateOne({ _id: payout.vendorId }, { $inc: { pendingPayout: -payout.amount, totalWithdrawn: payout.amount } });
  } else {
    const vendor = await Vendor.findByIdAndUpdate(
      payout.vendorId,
      { $inc: { pendingPayout: -payout.amount, balance: payout.amount } },
      { new: true }
    );
    if (vendor) {
      await VendorTransaction.create({
        vendorId: payout.vendorId,
        type: "withdrawal_refund",
        amount: payout.amount,
        payoutId: payout._id,
        balanceAfter: vendor.balance,
        note: adminNote ? `Withdrawal rejected: ${adminNote}` : "Withdrawal rejected",
      });
    }
  }

  return NextResponse.json({ success: true, payout });
}
