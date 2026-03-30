import mongoose from "mongoose";

const postbackAuditSchema = new mongoose.Schema(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
    },
    ambassadorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    visitorId: {
      type: String,
      required: true,
    },
    requestData: {
      type: Object,
      required: true,
    },
    responseStatus: {
      type: Number,
      required: true,
    },
    responseMessage: {
      type: String,
      trim: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

postbackAuditSchema.index({ campaignId: 1, ambassadorId: 1 });

export default mongoose.models.PostbackAudit ||
  mongoose.model("PostbackAudit", postbackAuditSchema);
