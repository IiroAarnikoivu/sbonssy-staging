import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema(
  {
    transactionId: { type: String, required: true, unique: true }, // Stripe PaymentIntent ID (pi_xxx)
    amount: { type: Number, required: true }, // In cents
    currency: { type: String, required: true },
    status: { type: String, required: true }, // e.g., succeeded, failed
    paymentMethod: { type: String, default: "N/A" }, // e.g., Visa ending in 4242
    invoiceId: { type: String, default: "N/A" }, // Stripe Invoice ID (in_xxx)
    customerId: { type: String, default: "N/A" }, // Stripe Customer ID (cus_xxx)
    brandId: { type: String, default: "N/A" }, // MongoDB User ID for brand
    campaignId: { type: String, default: "N/A" }, // MongoDB Campaign ID
    description: { type: String, default: "Invoice payment" },
  },
  { timestamps: true }
);

export default mongoose.models.Transaction ||
  mongoose.model("Transaction", TransactionSchema);
