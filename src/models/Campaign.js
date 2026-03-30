import mongoose from "mongoose";
import crypto from "crypto";

const campaignSchema = new mongoose.Schema(
  {
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    stateID: {
      enum: [0, 1, 2], // 0=Pending, 1=Published, 2=Paused
      type: Number,
      default: 0,
      required: true,
    },

    trackingId: {
      type: String,
      unique: true,
      default: () => `CMP_${crypto.randomBytes(4).toString("hex")}`,
    },
    basics: {
      campaignType: {
        type: String,
        enum: ["public", "apply", "private"],
        default: "public",
        required: true,
      },
      category: {
        type: String,
        enum: [
          "apparel",
          "technology",
          "nutrition",
          "wellness",
          "footwear",
          "services",
          "media_content",
          "outdoor_adventure_gear",
          "events_experiences",
          "accessories_equipment",
          "other",
        ],
        default: "apparel",
        required: true,
      },

      title: { type: String, required: true, trim: true, maxlength: 100 },
      description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000,
      },
      coverImages: [
        {
          url: { type: String, required: true },
          publicId: { type: String, required: true },
        },
        { _id: false },
      ],
      campaign_url: { type: String, trim: true },
      script_snippet: { type: String },
      startDate: { type: Date },
      endDate: { type: Date },
      isOngoing: { type: Boolean, default: false },
      targetRegions: [
        {
          type: String,
          enum: [
            "north_america",
            "europe",
            "asia",
            "africa",
            "south_america",
            "australia",
          ],
        },
      ],
    },
    products: [
      {
        shopifyProductId: { type: String, required: true },
        handle: { type: String, required: false },
        variantId: { type: String, required: false },
        name: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        price: { type: String, required: true },
        currency: { type: String, required: true, default: "USD" },
        image: { type: String },
        onlineStoreUrl: { type: String },
      },
    ],
    tags: {
      enabled: { type: Boolean, default: true },
      events: [
        {
          eventName: { type: String, required: true },
          trigger: {
            type: String,
            enum: ["page_load", "click", "form_submit", "custom"],
            required: true,
          },
          selector: { type: String },
          customScript: { type: String },
        },
      ],
    },
    creatorProfile: {
      followerRange: {
        min: { type: Number, min: 0 },
        max: {
          type: Number,

          min: 0,
          validate: {
            validator: function (value) {
              return value >= this.creatorProfile.followerRange.min;
            },
            message: "Max followers must be greater than min",
          },
        },
      },
      platforms: [
        {
          type: String,
          enum: ["instagram", "youtube", "tiktok", "x", "facebook"],
        },
      ],
      ambassadorTypes: [
        {
          type: String,
          enum: [
            "athlete",
            "team",
            "influencer",
            "para-athlete",
            "coach",
            "ex-athlete",
          ],
        },
      ],
      contentRequirements: { type: String, trim: true, maxlength: 2000 },
      requiresApproval: { type: Boolean, default: false },
    },
    compensation: {
      type: {
        type: String,
        enum: ["pay-per-sale", "pay-per-click", "pay-per-lead", "flat-fee"],
        required: true,
      },
      commission: { type: Number, default: 0, min: 0, max: 100 },
      amount: { type: Number, default: 0, min: 0 },
      gifting: { type: Boolean, default: false },
      duration: { type: Number, default: 0, required: true },
      affiliateLinkDestination: { type: String, default: "" },
    },
    // Verification gate for tracking before going live
    verification: {
      testToken: { type: String }, // one-time token embedded in test links/postbacks
      status: {
        type: String,
        enum: ["not_started", "in_progress", "verified", "accepted"],
        default: "not_started",
      },
      testClickEventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "VisitorEvent",
      },
      testConversionEventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "VisitorEvent",
      },
      testedAt: { type: Date },
      testedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      notes: { type: String, maxlength: 1000 },
    },
    assets: {
      logos: [
        {
          url: { type: String },
          publicId: { type: String },
        },
      ],
      photos: [
        {
          url: { type: String },
          publicId: { type: String },
        },
      ],
      videos: [
        {
          url: { type: String },
          publicId: { type: String },
        },
      ],
      styleGuide: {
        fonts: { type: String, trim: true, maxlength: 500 },
        colors: { type: String, trim: true, maxlength: 500 },
        guidelines: { type: String, trim: true, maxlength: 2000 },
      },
      examplePosts: [
        {
          url: { type: String },
          publicId: { type: String },
          mediaType: { type: String, enum: ["image", "video"] },
        },
      ],
    },
    goals: {
      clicks: { type: Number, min: 0 },
      sales: { type: Number, min: 0 },
      signups: { type: Number, min: 0 },
      budgetCap: { type: Number, min: 0 },

      shippingRegions: [
        {
          type: String,
          enum: [
            "north_america",
            "europe",
            "asia",
            "africa",
            "south_america",
            "australia",
          ],
        },
      ],
      shippingRequirements: { type: String, trim: true, maxlength: 1000 },
    },
    legal: {
      // termsAgreed: {
      //   type: Boolean,
      //   required: true,
      //   validate: {
      //     validator: function (value) {
      //       return value === true;
      //     },
      //     message: "You must agree to the terms",
      //   },
      // },
      ftcDisclosure: { type: Boolean, default: true },
      customTerms: {
        type: String,
        required: true,
        trim: true,
        maxlength: 5000,
      },
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

campaignSchema.index({ brandId: 1 });
campaignSchema.index({ "basics.campaignType": 1 });
campaignSchema.index({ "basics.startDate": 1, "basics.endDate": 1 });
campaignSchema.index({ "creatorProfile.platforms": 1 });
campaignSchema.index({ "compensation.type": 1 });
campaignSchema.index({ stateID: 1 });
campaignSchema.index({ "basics.category": 1 });
campaignSchema.index({ "basics.startDate": 1 });
campaignSchema.index({ "basics.endDate": 1 });

campaignSchema.virtual("durationDays").get(function () {
  if (this.basics.isOngoing || !this.basics.startDate || !this.basics.endDate) {
    return null;
  }
  const diffTime = Math.abs(this.basics.endDate - this.basics.startDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

export default mongoose.models.Campaign ||
  mongoose.model("Campaign", campaignSchema);
