import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Address from "@/models/Address";
import { getSessionUserId } from "@/lib/userSession";
import { addressDto, cleanAddressBody } from "@/lib/addressRules";

type Ctx = { params: Promise<{ id: string }> };

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

async function ownerAndId(ctx: Ctx) {
  const { id } = await ctx.params;
  const userId = await getSessionUserId();

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return {
      error: json(
        { success: false, message: "Please login again to use saved addresses." },
        401
      ),
    };
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return {
      error: json({ success: false, message: "Address not found." }, 404),
    };
  }

  return { id, userId };
}

/**
 * PATCH
 *  - { setDefault: true }  makes this the default address
 *  - full address fields   edits the address
 */
export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const who = await ownerAndId(ctx);
    if ("error" in who) return who.error;

    await connectDB();

    const existing = await Address.findOne({ _id: who.id, userId: who.userId });

    if (!existing) {
      return json({ success: false, message: "Address not found." }, 404);
    }

    const body = await request.json().catch(() => ({}));

    if (body.setDefault === true) {
      await Address.updateMany(
        { userId: who.userId },
        { $set: { isDefault: false } }
      );
      existing.isDefault = true;
      await existing.save();

      return json({
        success: true,
        message: "Default address updated.",
        address: addressDto(existing),
      });
    }

    const parsed = cleanAddressBody(body);

    if ("error" in parsed) {
      return json({ success: false, message: parsed.error }, 400);
    }

    Object.assign(existing, parsed.data);

    if (body.isDefault === true && !existing.isDefault) {
      await Address.updateMany(
        { userId: who.userId },
        { $set: { isDefault: false } }
      );
      existing.isDefault = true;
    }

    await existing.save();

    return json({
      success: true,
      message: "Address updated.",
      address: addressDto(existing),
    });
  } catch (error) {
    console.error("PATCH address error:", error);
    return json({ success: false, message: "Unable to update address." }, 500);
  }
}

/** DELETE: remove an address. If it was the default, the newest one takes over. */
export async function DELETE(_request: NextRequest, ctx: Ctx) {
  try {
    const who = await ownerAndId(ctx);
    if ("error" in who) return who.error;

    await connectDB();

    const deleted = await Address.findOneAndDelete({
      _id: who.id,
      userId: who.userId,
    });

    if (!deleted) {
      return json({ success: false, message: "Address not found." }, 404);
    }

    if (deleted.isDefault) {
      const next = await Address.findOne({ userId: who.userId }).sort({
        createdAt: -1,
      });

      if (next) {
        next.isDefault = true;
        await next.save();
      }
    }

    return json({ success: true, message: "Address deleted." });
  } catch (error) {
    console.error("DELETE address error:", error);
    return json({ success: false, message: "Unable to delete address." }, 500);
  }
}
