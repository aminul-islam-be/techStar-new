import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

/**
 * Who is the logged-in customer?
 * The site currently identifies customers with the `x-user-id` header (same as
 * /api/orders). Keep this in ONE place: when customer login is hardened later,
 * only this function has to change.
 */
export async function getChatCustomer(request: Request) {
  const id = request.headers.get("x-user-id") || "";
  if (!mongoose.Types.ObjectId.isValid(id)) return null;

  await connectDB();
  const user = await User.findOne({ _id: id, active: true }).select("fullName").lean();
  if (!user) return null;

  return {
    id: String(user._id),
    firstName: String(user.fullName || "Customer").trim().split(/\s+/)[0] || "Customer",
  };
}
