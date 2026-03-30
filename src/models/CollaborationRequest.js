import mongoose from "mongoose";

const collaborationRequestSchema = new mongoose.Schema(
  {
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    ambassadorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "cancelled"],
      default: "pending",
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const CollaborationRequest =
  mongoose.models.CollaborationRequest ||
  mongoose.model("CollaborationRequest", collaborationRequestSchema);
