// /models/Invite.js
import mongoose from "mongoose";

const inviteSchema = new mongoose.Schema(
  {
    inviterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    invitedEmail: {
      type: String,
      required: true,
      trim: true,
    },
    permission: {
      type: String,
      enum: ["Can View", "Can Modify"],
      required: true,
      default: "Can Modify",
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "revoked"],
      default: "pending",
    },
    token: {
      type: String,
      unique: true,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    supabaseId: {
      type: String, // Store Supabase user ID for synchronization
    },
  },
  { timestamps: true },
);

// Ensure unique index on invitedEmail and inviterId to prevent duplicate invites
inviteSchema.index({ invitedEmail: 1, inviterId: 1 }, { unique: true });

export default mongoose.models.Invite || mongoose.model("Invite", inviteSchema);
