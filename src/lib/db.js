import mongoose from "mongoose";

export async function connectDB(label = "Next.js") {
  if (mongoose.connection.readyState >= 1) return;
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`> MongoDB Connected (${label})`);
}
