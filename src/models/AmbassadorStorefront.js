import mongoose from "mongoose";

const ambassadorStorefrontSchema = new mongoose.Schema(
  {
    ambassadorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
    },
    productId: {
      type: String,
      required: true,
    },
    productData: {
      shopifyProductId: { type: String, required: true },
      handle: { type: String },
      name: { type: String, required: true },
      description: { type: String },
      price: { type: String, required: true },
      currency: { type: String, required: true, default: "USD" },
      image: { type: String },
    },
    trackingUrl: {
      type: String,
      required: true,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Compound index to ensure unique ambassador-product-campaign combinations
ambassadorStorefrontSchema.index(
  { ambassadorId: 1, campaignId: 1, productId: 1 },
  { unique: true }
);

// Index for efficient queries
ambassadorStorefrontSchema.index({ ambassadorId: 1, isActive: 1 });
ambassadorStorefrontSchema.index({ campaignId: 1 });

export default mongoose.models.AmbassadorStorefront ||
  mongoose.model("AmbassadorStorefront", ambassadorStorefrontSchema);
