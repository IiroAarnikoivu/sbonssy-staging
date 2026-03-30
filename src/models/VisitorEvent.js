import mongoose from "mongoose";

const visitorEventSchema = new mongoose.Schema(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
    },
    athleteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    visitorId: {
      type: String,
      required: true,
    },
    eventType: {
      type: String,
      enum: ["click", "conversion"],
      required: true,
    },
    eventData: {
      eventName: {
        type: String,
        enum: ["click", "lead", "purchase", "refund", "participation"],
        required: true,
      },
      amount: { type: Number, default: 0 }, // Ambassador earnings
      platformFee: { type: Number, default: 0 }, // Platform fee (20%)
      currency: { type: String, default: "EUR" },
      transactionId: { type: String }, // Optional for existing data
      originalSaleAmount: { type: Number }, // For pay-per-sale
      redirectUrl: { type: String }, // Optional for existing data
      // Cart-level data (Shopify / ecommerce)
      cartTotal: { type: Number },
      cartCurrency: { type: String },
      lineItems: { type: [mongoose.Schema.Types.Mixed], default: [] },
      // Product-level attribution (optional)
      productId: { type: String },
      productHandle: { type: String },
      productName: { type: String },
    },
    // Test-mode marker for verification flows
    isTest: { type: Boolean, default: false },
    // Commission lifecycle status
    commissionStatus: {
      type: String,
      enum: ["pending", "cancelled", "locked", "paid"],
      default: "pending",
    },
    // Shopify order identifier for webhook refund matching
    shopifyOrderId: { type: String, index: true },
    // Event-level cancellation (e.g., refund voiding a purchase before invoicing)
    cancelledAt: { type: Date },
    cancellationReason: { type: String },
    // Refund tracking
    refundedAt: { type: Date },
    refundAmount: { type: Number },
    refundType: { type: String, enum: ["full", "partial"] },
    originalCommissionAmount: { type: Number }, // Preserved before partial reduction
    // Invoicing markers to ensure one invoice per event
    invoicedAt: { type: Date },
    invoicedInvoiceId: { type: String }, // Stripe invoice id
    invoiceCancelledAt: { type: Date },
    invoiceCancellationReason: { type: String },
    // VAT timing snapshots (Gold Standard)
    brandVatCountry: { type: String },
    brandVatStatus: { type: String },
    athleteVatCountry: { type: String },
    athleteVatStatus: { type: String },
  },
  { timestamps: true },
);

visitorEventSchema.index({ campaignId: 1, athleteId: 1, eventType: 1 });
// Allow multiple events (e.g., purchase and refund) under the same transactionId,
// but keep them unique per (transactionId, eventName)
visitorEventSchema.index(
  { "eventData.transactionId": 1, "eventData.eventName": 1 },
  {
    unique: true,
    partialFilterExpression: { "eventData.transactionId": { $exists: true } },
  },
);
// Ensure a single participation conversion per ambassador per campaign
visitorEventSchema.index(
  { campaignId: 1, athleteId: 1, "eventData.eventName": 1 },
  {
    unique: true,
    partialFilterExpression: { "eventData.eventName": "participation" },
  },
);
// Efficient lookup for refund webhooks by Shopify order ID
visitorEventSchema.index({ shopifyOrderId: 1, "eventData.eventName": 1 });
// Commission status queries (lock cron, payout filtering)
visitorEventSchema.index({
  commissionStatus: 1,
  "eventData.eventName": 1,
  createdAt: 1,
});

export default mongoose.models.VisitorEvent ||
  mongoose.model("VisitorEvent", visitorEventSchema);
