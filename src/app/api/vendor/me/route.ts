import { NextResponse } from "next/server";
import { getCurrentVendor, unauthorized } from "@/lib/vendorAuth";
import { getSettings } from "@/lib/marketplace";

function publicVendor(v: Awaited<ReturnType<typeof getCurrentVendor>>, defaultRate: number) {
  if (!v) return null;
  const o = v.toObject();
  delete (o as { password?: string }).password;
  return { ...o, _id: String(v._id), effectiveCommissionRate: v.commissionRate ?? defaultRate };
}

export async function GET() {
  const vendor = await getCurrentVendor();
  if (!vendor) return unauthorized();
  const settings = await getSettings();
  return NextResponse.json({
    success: true,
    vendor: publicVendor(vendor, settings.defaultCommissionRate),
    minWithdrawal: settings.minWithdrawal,
  });
}

export async function PATCH(request: Request) {
  const vendor = await getCurrentVendor();
  if (!vendor) return unauthorized();

  const body = await request.json();

  if (typeof body.shopName === "string" && body.shopName.trim()) vendor.shopName = body.shopName.trim();
  if (typeof body.ownerName === "string" && body.ownerName.trim()) vendor.ownerName = body.ownerName.trim();
  if (typeof body.email === "string") vendor.email = body.email.trim().toLowerCase() || undefined;
  if (typeof body.address === "string") vendor.address = body.address.trim();
  if (typeof body.description === "string") vendor.description = body.description.trim();
  if (typeof body.logo === "string") vendor.logo = body.logo.trim();

  if (body.payoutMethod) {
    const m = body.payoutMethod;
    const type = String(m.type || "");
    const accountNumber = String(m.accountNumber || "").trim();
    const accountName = String(m.accountName || "").trim();
    if (!["bkash", "nagad", "rocket", "bank"].includes(type) || !accountNumber || !accountName) {
      return NextResponse.json(
        { success: false, message: "Payout method needs a type, account name and account number." },
        { status: 400 }
      );
    }
    vendor.payoutMethod = {
      type: type as "bkash" | "nagad" | "rocket" | "bank",
      accountName,
      accountNumber,
      bankName: type === "bank" ? String(m.bankName || "").trim() : undefined,
    };
  }

  await vendor.save();
  const settings = await getSettings();
  return NextResponse.json({ success: true, vendor: publicVendor(vendor, settings.defaultCommissionRate) });
}
