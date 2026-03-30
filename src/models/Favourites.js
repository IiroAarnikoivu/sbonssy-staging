import mongoose from "mongoose";

const FavouriteSchema = new mongoose.Schema(
  {
    ambassadorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    fanId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign" },
  },
  { timestamps: true }
);

export default mongoose.models.Favorites ||
  mongoose.model("Favorites", FavouriteSchema);
