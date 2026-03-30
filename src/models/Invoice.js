import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    campaignId: { type: String, required: true },
    // Optional reference to the originating visitor event (for per-event invoicing)
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "VisitorEvent" },
    stripeInvoiceId: { type: String, required: true },
    invoiceNumber: { type: String }, // Human-readable invoice number
    // VAT-aware invoice amounts (snapshot fields)
    subtotal: { type: Number }, // Amount before VAT
    vatAmount: { type: Number, default: 0 }, // VAT amount
    vatRate: { type: Number, default: 0 }, // VAT rate snapshot (default 0 unless applied)
    vatTreatment: {
      type: String,
      enum: ["domestic", "reverse_charge", "export"],
      default: "export",
    },
    total: { type: Number }, // subtotal + vatAmount
    baseAmount: { type: Number }, // Base amount before VAT (for compatibility)
    ourVatNumber: { type: String, default: "FI12345678" }, // Sbonssy's VAT number
    clientVatNumber: { type: String }, // Client's VAT number snapshot
    brandCountry: { type: String }, // Brand's country for VAT calculation
    brandVatStatus: { type: String }, // Brand's VAT status snapshot
    notes: [String], // VAT treatment notes (reverse charge, export, etc.)
    // Legacy amount field for backward compatibility
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: "EUR" },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    status: {
      type: String,
      enum: ["draft", "open", "paid", "void", "uncollectible", "credited"],
      required: true,
    },
    cancelledAt: { type: Date },
    cancellationReason: { type: String },
    lineItems: [
      {
        description: { type: String, required: true },
        amount: { type: Number, required: true },
        metadata: { type: Map, of: String, default: {} },
      },
    ],
    metrics: {
      // views: { type: Number, required: true },
      clicks: { type: Number, required: true },
      conversions: { type: Number, required: true },
      // dropoffs: { type: Number, required: true },
    },
    pdfUrl: { type: String }, // PDF invoice URL
    ambassadorCreditedAt: { type: Date, default: null }, // Timestamp when commission was credited to ambassador balance
  },
  { timestamps: true }
);

export default mongoose.models.Invoice ||
  mongoose.model("Invoice", invoiceSchema);
