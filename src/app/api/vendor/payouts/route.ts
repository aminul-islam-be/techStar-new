import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Vendor from "@/models/Vendor";
import Payout from "@/models/Payout";
import VendorTransaction from "@/models/VendorTransaction";
import { getCurrentVendor, unauthorized } from "@/lib/vendorAuth";
import { getSettings, round2 } from "@/lib/marketplace";

/** Vendor asks for a withdrawal. The money is held immediately. */
export async function POST(request: Request) {
  try {
    const vendor = await getCurrentVendor({ requireApproved: true });
    if (!vendor) return unauthorized("Your shop must be approved to withdraw.");
    await connectDB();

    const body = await request.json();
    const amount = round2(Number(body.amount));
    const settings = await getSettings();

    if (!vendor.payoutMethod?.accountNumber) {
      return NextResponse.json(
        { success: false, message: "Please add your bKash / Nagad / bank details in Profile first." },
        { status: 400 }
      );
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ success: false, message: "Enter a valid amount." }, { status: 400 });
    }
    if (amount < settings.minWithdrawal) {
      return NextResponse.json(
        { success: false, message: `Minimum withdrawal is ৳${settings.minWithdrawal}.` },
        { status: 400 }
      );
    }

    // Atomic: only succeeds if enough balance is still available.
    const updated = await Vendor.findOneAndUpdate(
      { _id: vendor._id, balance: { $gte: amount } },
      { $inc: { balance: -amount, pendingPayout: amount } },
      { new: true }
    );
    if (!updated) {
      return NextResponse.json({ success: false, message: "Not enough balance." }, { status: 400 });
    }

    const payout = await Payout.create({
      vendorId: vendor._id,
      amount,
      method: {
        type: vendor.payoutMethod.type,
        accountName: vendor.payoutMethod.accountName,
        accountNumber: vendor.payoutMethod.accountNumber,
        bankName: vendor.payoutMethod.bankName,
      },
    });

    await VendorTransaction.create({
      vendorId: vendor._id,
      type: "withdrawal",
      amount: -amount,
      payoutId: payout._id,
      balanceAfter: updated.balance,
      note: "Withdrawal requested",
    });

    return NextResponse.json({ success: true, message: "Withdrawal requested. The admin will send the money soon.", payout });
  } catch (error) {
    console.error("Vendor payout error:", error);
    return NextResponse.json({ success: false, message: "Unable to request withdrawal." }, { status: 500 });
  }
}
