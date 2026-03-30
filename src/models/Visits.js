import mongoose from "mongoose";

const VisitSchema = new mongoose.Schema(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
    },
    promoCode: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    ip: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
VisitSchema.index({ campaignId: 1, timestamp: -1 });

export default mongoose.models.Visit || mongoose.model("Visit", VisitSchema);
