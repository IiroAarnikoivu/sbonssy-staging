import mongoose from "mongoose";

const campaignInteractionSchema = new mongoose.Schema(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    interactionType: {
      type: String,
      enum: ["apply", "public", "private"],
      required: true,
    },
    termsAccepted: {
      type: Boolean,
    },
    status: {
      type: String,
      enum: [
        "not_applied",
        "pending",
        "accepted",
        "rejected",
        "active",
        "inactive",
        "declined",
      ],
      required: true,
    },
  },
  { timestamps: true }
);

campaignInteractionSchema.index({ campaignId: 1, userId: 1 });

export default mongoose.models.CampaignInteraction ||
  mongoose.model("CampaignInteraction", campaignInteractionSchema);
