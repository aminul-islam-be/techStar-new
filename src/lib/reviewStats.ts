import mongoose from "mongoose";
import Review from "@/models/Review";
import Product from "@/models/Product";

/**
 * Re-counts the APPROVED reviews of a product and stores the average + count
 * on the product itself, so product lists can show stars without extra queries.
 */
export async function recalcProductRating(
  productId: string | mongoose.Types.ObjectId
) {
  const id = new mongoose.Types.ObjectId(String(productId));

  const [row] = await Review.aggregate<{
    _id: mongoose.Types.ObjectId;
    avg: number;
    count: number;
  }>([
    { $match: { productId: id, status: "approved" } },
    {
      $group: {
        _id: "$productId",
        avg: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  const reviewCount = row ? row.count : 0;
  const ratingAverage = row ? Math.round(row.avg * 10) / 10 : 0;

  await Product.updateOne({ _id: id }, { $set: { ratingAverage, reviewCount } });

  return { ratingAverage, reviewCount };
}
