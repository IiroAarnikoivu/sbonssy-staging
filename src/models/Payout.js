import mongoose from "mongoose";

const payoutSchema = new mongoose.Schema({
  ambassadorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Campaign",
    // Not required for batched payouts (multiple campaigns)
  },
  stripePayoutId: { type: String, required: true },
  stripeTransferId: { type: String }, // Stripe Connect transfer ID
  // VAT-aware payout amounts (snapshot fields)
  commissionAmount: { type: Number, required: true },
  vatAmount: { type: Number, default: 0 },
  grossAmount: { type: Number, required: true }, // commission + VAT
  vatApplied: { type: Boolean, default: false },
  vatRate: { type: Number, default: 0 }, // snapshot of VAT rate at time of payout
  vatNumber: { type: String }, // snapshot of ambassador's VAT number
  vatCountry: { type: String }, // snapshot of ambassador's VAT country
  // Legacy amount field for backward compatibility
  amount: { type: Number, required: true },
  // Fixed per-payout transfer fee (in cents)
  transferFeeCents: { type: Number, default: 0 },
  // Net amount paid out after deducting transfer fee (in cents)
  netAmountCents: { type: Number },
  status: {
    type: String,
    enum: ["pending", "transferred", "paid", "failed"],
    default: "pending",
  },
  invoiceUrl: { type: String }, // PDF invoice URL
  period: { type: String }, // billing period identifier
  // Batch payout fields
  payoutBatchId: { type: String }, // Unique batch identifier (YYYY-MM-DD format)
  payoutType: {
    type: String,
    enum: ["per_invoice", "batched"],
    default: "per_invoice",
  },
  createdAt: { type: Date, default: Date.now },
});

// Compound index to prevent duplicate batch payouts per ambassador per batch
payoutSchema.index(
  { ambassadorId: 1, payoutBatchId: 1 },
  {
    unique: true,
    partialFilterExpression: { payoutBatchId: { $exists: true, $ne: null } },
  }
);

export default mongoose.models.Payout || mongoose.model("Payout", payoutSchema);
