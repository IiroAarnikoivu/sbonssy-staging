import mongoose from "mongoose";

const adminTestEventSchema = new mongoose.Schema(
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
      amount: { type: Number, default: 0 },
      platformFee: { type: Number, default: 0 },
      currency: { type: String, default: "EUR" },
      transactionId: { type: String },
      originalSaleAmount: { type: Number },
      redirectUrl: { type: String },
      // Cart-level data (Shopify / ecommerce)
      cartTotal: { type: Number },
      cartCurrency: { type: String },
      lineItems: { type: [mongoose.Schema.Types.Mixed], default: [] },
      // Product-level attribution (optional)
      productId: { type: String },
      productHandle: { type: String },
      productName: { type: String },
    },
    isTest: { type: Boolean, default: true },
    // VAT timing snapshots (Gold Standard)
    brandVatCountry: { type: String },
    brandVatStatus: { type: String },
    athleteVatCountry: { type: String },
    athleteVatStatus: { type: String },
  },
  { timestamps: true },
);

adminTestEventSchema.index({ campaignId: 1, athleteId: 1, eventType: 1 });
adminTestEventSchema.index(
  { "eventData.transactionId": 1, "eventData.eventName": 1 },
  {
    unique: true,
    partialFilterExpression: { "eventData.transactionId": { $exists: true } },
  },
);
adminTestEventSchema.index(
  { campaignId: 1, athleteId: 1, "eventData.eventName": 1 },
  {
    unique: true,
    partialFilterExpression: { "eventData.eventName": "participation" },
  },
);

export default mongoose.models.AdminTestEvent ||
  mongoose.model("AdminTestEvent", adminTestEventSchema);
