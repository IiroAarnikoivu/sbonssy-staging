import mongoose from "mongoose";

const ShortLinkSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, index: true },
  longUrl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

ShortLinkSchema.index({ longUrl: 1 });

const ShortLink =
  mongoose.models.ShortLink || mongoose.model("ShortLink", ShortLinkSchema);

export default ShortLink;
