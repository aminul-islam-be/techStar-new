import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Please define MONGODB_URI in .env.local");
}

const globalForMongoose = globalThis as typeof globalThis & {
  mongoose: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
};

const cached = globalForMongoose.mongoose || {
  conn: null,
  promise: null,
};

globalForMongoose.mongoose = cached;

export default async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI as string);
  }

  cached.conn = await cached.promise;

  return cached.conn;
}
