import mongoose from "mongoose";

const attributionSchema = new mongoose.Schema(
  {
    // Visitor tracking
    visitorId: {
      type: String,
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
    },
    // Attribution data
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
    // Click tracking
    clickedAt: {
      type: Date,
      default: Date.now,
    },
    landingUrl: {
      type: String,
    },
    referrerUrl: {
      type: String,
    },
    // Visitor fingerprinting
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    // Browser/device info
    deviceType: {
      type: String,
      enum: ["desktop", "mobile", "tablet", "unknown"],
      default: "unknown",
    },
    browser: {
      type: String,
    },
    // Geo data (optional)
    country: {
      type: String,
    },
    city: {
      type: String,
    },
    // UTM parameters
    utmSource: {
      type: String,
    },
    utmMedium: {
      type: String,
    },
    utmCampaign: {
      type: String,
    },
    utmTerm: {
      type: String,
    },
    utmContent: {
      type: String,
    },
    // Additional metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
    // Conversion tracking
    converted: {
      type: Boolean,
      default: false,
    },
    convertedAt: {
      type: Date,
    },
    conversionEventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VisitorEvent",
    },
    // Expiration for cleanup
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  },
  { timestamps: true },
);

// Indexes
attributionSchema.index({ visitorId: 1, campaignId: 1 });
attributionSchema.index({ sessionId: 1 });
attributionSchema.index({ campaignId: 1, athleteId: 1 });
attributionSchema.index({ converted: 1 });
attributionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

export default mongoose.models.Attribution ||
  mongoose.model("Attribution", attributionSchema);
