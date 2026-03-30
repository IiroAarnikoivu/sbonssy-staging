import mongoose from "mongoose";

const campaignShareSchema = new mongoose.Schema(
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
    shareUrl: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

campaignShareSchema.index({ campaignId: 1, athleteId: 1 });

export default mongoose.models.CampaignShare ||
  mongoose.model("CampaignShare", campaignShareSchema);
