// models/FavoriteCampaign.js
import mongoose from "mongoose";

const favoriteCampaignSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
    },
  },
  { timestamps: true }
);

// Ensure unique combination of userId and campaignId
favoriteCampaignSchema.index({ userId: 1, campaignId: 1 }, { unique: true });

export default mongoose.models.FavoriteCampaign ||
  mongoose.model("FavoriteCampaign", favoriteCampaignSchema);
