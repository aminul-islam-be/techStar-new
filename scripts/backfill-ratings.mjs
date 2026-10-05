// One-time script: fills ratingAverage + reviewCount on every product
// from the reviews that are already approved.
//
// Run:  node --env-file=.env.local scripts/backfill-ratings.mjs
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error("MONGODB_URI is missing. Run with: node --env-file=.env.local scripts/backfill-ratings.mjs");
  process.exit(1);
}

await mongoose.connect(uri);
const db = mongoose.connection.db;

const rows = await db
  .collection("reviews")
  .aggregate([
    { $match: { status: "approved" } },
    { $group: { _id: "$productId", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ])
  .toArray();

// products that have no approved review get 0 / 0
await db
  .collection("products")
  .updateMany({}, { $set: { ratingAverage: 0, reviewCount: 0 } });

for (const row of rows) {
  await db.collection("products").updateOne(
    { _id: row._id },
    { $set: { ratingAverage: Math.round(row.avg * 10) / 10, reviewCount: row.count } }
  );
}

console.log(`Done. Updated ratings for ${rows.length} product(s).`);
await mongoose.disconnect();
