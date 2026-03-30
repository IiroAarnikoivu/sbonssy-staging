import mongoose from "mongoose";
import crypto from "crypto";

const socialMediaSchema = new mongoose.Schema(
  {
    facebook: { type: String, trim: true },
    twitter: { type: String, trim: true },
    instagram: { type: String, trim: true },
    linkedin: { type: String, trim: true },
    tiktok: { type: String, trim: true },
    youtube: { type: String, trim: true },
    website: { type: String, trim: true },
  },
  { _id: false },
);
const vatSchema = new mongoose.Schema(
  {
    vatNumber: { type: String, trim: true },
    vatCountry: { type: String, trim: true }, // ISO-2 country code
    vatStatus: {
      type: String,
      enum: ["valid", "verified", "invalid", "not_provided"],
      default: "not_provided",
    },
    uiBusinessType: { type: String, trim: true },
    businessRegistrationNumber: { type: String, trim: true },
    needsVatOnCommission: { type: Boolean, default: false },
    vatRate: { type: Number, default: 0 }, // Default 0 when VAT status is not provided; set to 0.255 when registered where applicable
    lastVatCheckedAt: { type: Date },
    registrationCountry: { type: String, trim: true }, // ISO-2 for business registration
  },
  { _id: false, timestamps: true },
);
const locationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      required: true,
      default: "Point",
    },
    coordinates: {
      type: [Number],
      required: true,
    },
    locationName: {
      type: String,
      trim: true,
    },
  },
  { _id: false },
);

const imageSchema = new mongoose.Schema(
  {
    url: { type: String },
    isProfile: { type: Boolean, default: false },
    publicId: { type: String, default: "" },
  },
  { _id: false },
);

const baseProfileSchema = new mongoose.Schema(
  {
    biography: { type: String, trim: true },
    achievements: { type: String, trim: true },
    records: { type: String, trim: true },
    goals: { type: String, trim: true },
    interests: [String],
    images: [imageSchema],
    socialMedia: socialMediaSchema,
    stripeAccountId: { type: String },
    payoutBalanceCents: { type: Number, default: 0 }, // Accumulated unpaid commission in cents
    onboardingStatus: {
      type: String,
      enum: ["pending", "completed", "restricted"],
      default: "pending",
    },
  },
  { _id: false },
);

const shopifyDetailsSchema = new mongoose.Schema(
  {
    myShopifyDomain: { type: String, trim: true },
    shopifyId: { type: String },
  },
  { timestamps: true },
);

const athleteSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    address: { type: String, trim: true },
    taxNumber: { type: String, trim: true },
    gender: { type: String },
    sports: [String],
    level: { type: String },
    teamClubName: { type: String, trim: true },
    location: locationSchema,
    vatDetails: vatSchema,
    tracking_key: {
      type: String,
      default: () => `AMB_${crypto.randomBytes(4).toString("hex")}`,
    },
  },
  { _id: false },
).add(baseProfileSchema);

const exAthleteSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    address: { type: String, trim: true },
    taxNumber: { type: String, trim: true },
    gender: { type: String },
    sports: [String],
    level: { type: String },
    teamClubName: { type: String, trim: true },
    location: locationSchema,
    vatDetails: vatSchema,
    tracking_key: {
      type: String,
      default: () => `AMB_${crypto.randomBytes(4).toString("hex")}`,
    },
  },
  { _id: false },
).add(baseProfileSchema);

const paraAthleteSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    address: { type: String, trim: true },
    taxNumber: { type: String, trim: true },
    gender: { type: String },
    sports: [String],
    vatDetails: vatSchema,
    level: { type: String },
    teamClubName: { type: String, trim: true },
    location: locationSchema,
    tracking_key: {
      type: String,
      default: () => `AMB_${crypto.randomBytes(4).toString("hex")}`,
    },
  },
  { _id: false },
).add(baseProfileSchema);

const coachSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    address: { type: String, trim: true },
    taxNumber: { type: String, trim: true },
    gender: { type: String },
    sports: [String],
    level: { type: String },
    vatDetails: vatSchema,
    teamClubName: { type: String, trim: true },
    location: locationSchema,
    tracking_key: {
      type: String,
      default: () => `AMB_${crypto.randomBytes(4).toString("hex")}`,
    },
  },
  { _id: false },
).add(baseProfileSchema);

const teamSchema = new mongoose.Schema(
  {
    subRole: { type: String },
    address: { type: String, trim: true },
    companyNumber: { type: String, trim: true },
    name: { type: String, trim: true },
    teamClubName: { type: String, trim: true },
    sports: [String],
    level: { type: String },
    location: locationSchema,
    vatDetails: vatSchema,
    tracking_key: {
      type: String,
      default: () => `AMB_${crypto.randomBytes(4).toString("hex")}`,
    },
  },
  { _id: false },
).add(baseProfileSchema);

const influencerSchema = new mongoose.Schema(
  {
    subRole: { type: String },
    address: { type: String, trim: true },
    taxNumber: { type: String, trim: true },
    name: { type: String, trim: true },
    gender: { type: String },
    vatDetails: vatSchema,
    location: locationSchema,
    tracking_key: {
      type: String,
      default: () => `AMB_${crypto.randomBytes(4).toString("hex")}`,
    },
  },
  { _id: false },
).add(baseProfileSchema);

const brandSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    currentJobTitle: { type: String, trim: true },
    companyName: { type: String, trim: true },
    vatNumber: { type: String, trim: true },
    websiteUrl: { type: String, trim: true },
    intro: { type: String, trim: true },
    legalName: { type: String, trim: true },
    address: { type: String, trim: true },
    valuesAndInterests: [String],
    companyLogo: { type: String },
    workingPeople: { type: String },
    howDidYouHear: { type: String },
    tracking_key: {
      type: String,
      default: () => `BRAND_${crypto.randomBytes(4).toString("hex")}`,
    },
    postback_url: { type: String, trim: true, default: "" },
    stripeCustomerId: { type: String },
    shopifyDetails: shopifyDetailsSchema,
    // VAT fields for brand invoicing
    country: { type: String, trim: true }, // ISO-2 country code
    // Align brand VAT storage with ambassador structure
    vatDetails: vatSchema,
    // Webhook configuration for server-to-server conversion tracking
    webhookApiKey: { type: String, select: false }, // Encrypted, not returned by default
    webhookSecret: { type: String, select: false }, // For HMAC signature verification
    webhookEnabled: { type: Boolean, default: false },
    webhookUrl: { type: String, trim: true }, // Optional: reverse webhook to notify brand
    isWebhookConfigured: { type: Boolean, default: false },
    lastWebhookAt: { type: Date },
  },
  { _id: false },
);

const fanSchema = new mongoose.Schema(
  {
    favoriteTeams: [{ type: String, trim: true }],
    interests: [String],
  },
  { _id: false },
);

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    permissions: [String],
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    email: { type: String },
    phoneNumber: { type: String, trim: true },
    supabaseId: { type: String },
    authProvider: { type: String },
    role: { type: String },
    isProfileCompleted: {
      type: Boolean,
      default: false,
    },
    termsAccepted: { type: Boolean, default: false },
    termsAcceptedAt: { type: Date, default: null },
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    permission: { type: String, default: null },
    subRole: { type: String },
    athlete: { type: athleteSchema },
    team: { type: teamSchema },
    influencer: { type: influencerSchema },
    brand: { type: brandSchema },
    exAthlete: { type: exAthleteSchema },
    paraAthlete: { type: paraAthleteSchema },
    coach: { type: coachSchema },
    fan: { type: fanSchema },
    admin: { type: adminSchema },
    stateId: {
      type: Number,
      default: 0,
      enum: [0, 1, 2],
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    shopify_token: {
      type: String,
    },
  },
  { timestamps: true },
);

// Performance indexes
userSchema.index({ email: 1 });
userSchema.index({ supabaseId: 1 });
userSchema.index({ role: 1 });
// Compound index for marketplace queries (role + isProfileCompleted is the base filter)
userSchema.index({ role: 1, isProfileCompleted: 1 });
userSchema.index({ role: 1, isProfileCompleted: 1, createdAt: -1 });
userSchema.index({ invitedBy: 1 });
userSchema.index({ "brand.companyName": 1 });
userSchema.index({ "athlete.name": 1 });
userSchema.index({ "exAthlete.name": 1 });
userSchema.index({ "paraAthlete.name": 1 });
userSchema.index({ "coach.name": 1 });
userSchema.index({ "influencer.name": 1 });
userSchema.index({ "team.name": 1 });
userSchema.index({ "team.teamClubName": 1 });

// Partial unique indexes for nested tracking_key fields
userSchema.index(
  { "athlete.tracking_key": 1 },
  {
    unique: true,
    partialFilterExpression: { "athlete.tracking_key": { $type: "string" } },
  },
);
userSchema.index(
  { "exAthlete.tracking_key": 1 },
  {
    unique: true,
    partialFilterExpression: { "exAthlete.tracking_key": { $type: "string" } },
  },
);
userSchema.index(
  { "paraAthlete.tracking_key": 1 },
  {
    unique: true,
    partialFilterExpression: {
      "paraAthlete.tracking_key": { $type: "string" },
    },
  },
);
userSchema.index(
  { "coach.tracking_key": 1 },
  {
    unique: true,
    partialFilterExpression: { "coach.tracking_key": { $type: "string" } },
  },
);
userSchema.index(
  { "team.tracking_key": 1 },
  {
    unique: true,
    partialFilterExpression: { "team.tracking_key": { $type: "string" } },
  },
);
userSchema.index(
  { "influencer.tracking_key": 1 },
  {
    unique: true,
    partialFilterExpression: { "influencer.tracking_key": { $type: "string" } },
  },
);
userSchema.index(
  { "brand.tracking_key": 1 },
  {
    unique: true,
    partialFilterExpression: { "brand.tracking_key": { $type: "string" } },
  },
);

export default mongoose.models.User || mongoose.model("User", userSchema);
