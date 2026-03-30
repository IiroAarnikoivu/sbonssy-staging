import mongoose from "mongoose";

const transferSchema = new mongoose.Schema({
  transferId: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  status: { type: String, required: true },
  destination: { type: String, required: true }, // Stripe account ID
  invoiceId: { type: String, required: true },
  athleteId: { type: String, required: true },
  brandId: { type: String, required: true },
  campaignId: { type: String, required: true },
  createdAt: { type: Date, required: true },
  description: { type: String, required: true },
});

export default mongoose.models.Transfer ||
  mongoose.model("Transfer", transferSchema);
