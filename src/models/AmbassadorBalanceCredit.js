import mongoose from "mongoose";

/**
 * AmbassadorBalanceCredit Model
 * Audit trail for balance credits when invoices are paid
 * Each paid invoice results in one credit to the ambassador's balance
 */
const ambassadorBalanceCreditSchema = new mongoose.Schema({
  ambassadorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Invoice",
    required: true,
    unique: true, // Ensures one credit per invoice (idempotency)
  },
  stripeInvoiceId: { type: String, required: true },
  campaignId: { type: String },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: "VisitorEvent" },
  
  // VAT-aware amounts in cents
  commissionAmountCents: { type: Number, required: true },
  vatAmountCents: { type: Number, default: 0 },
  grossAmountCents: { type: Number, required: true }, // Total credited to balance
  vatApplied: { type: Boolean, default: false },
  vatRate: { type: Number, default: 0 },
  vatNumber: { type: String },
  vatCountry: { type: String },
  
  // Balance snapshot after this credit
  balanceBeforeCents: { type: Number, required: true },
  balanceAfterCents: { type: Number, required: true },
  
  // Metadata
  period: { type: String }, // YYYY-MM format
  description: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// Compound index for querying ambassador credits efficiently
ambassadorBalanceCreditSchema.index({ ambassadorId: 1, createdAt: -1 });

// Index on stripeInvoiceId for lookups
ambassadorBalanceCreditSchema.index({ stripeInvoiceId: 1 });

export default mongoose.models.AmbassadorBalanceCredit ||
  mongoose.model("AmbassadorBalanceCredit", ambassadorBalanceCreditSchema);
