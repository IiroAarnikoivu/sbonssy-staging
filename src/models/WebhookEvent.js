import mongoose from "mongoose";

const webhookEventSchema = new mongoose.Schema(
  {
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: ["conversion", "test", "refund", "cancellation"],
      required: true,
      default: "conversion",
    },
    // Raw webhook payload
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    // HTTP headers for debugging
    headers: {
      type: mongoose.Schema.Types.Mixed,
    },
    // Signature verification
    signature: {
      type: String,
    },
    signatureValid: {
      type: Boolean,
      default: false,
    },
    // Processing status
    status: {
      type: String,
      enum: ["pending", "processing", "success", "failed"],
      default: "pending",
      index: true,
    },
    // Error information if failed
    errorMessage: {
      type: String,
    },
    errorStack: {
      type: String,
    },
    // Retry tracking
    retryCount: {
      type: Number,
      default: 0,
    },
    lastRetryAt: {
      type: Date,
    },
    // Link to created VisitorEvent if successful
    visitorEventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VisitorEvent",
    },
    // Processing metadata
    processingStartedAt: {
      type: Date,
    },
    processingCompletedAt: {
      type: Date,
    },
    processingDurationMs: {
      type: Number,
    },
    // IP address for security tracking
    ipAddress: {
      type: String,
    },
    // Idempotency key for duplicate detection
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  { timestamps: true },
);

// Indexes for querying
webhookEventSchema.index({ brandId: 1, status: 1 });
webhookEventSchema.index({ createdAt: -1 });
webhookEventSchema.index({ "payload.orderId": 1 });
webhookEventSchema.index({ "payload.transactionId": 1 });

// TTL index to auto-delete old webhook events after 90 days
webhookEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

export default mongoose.models.WebhookEvent ||
  mongoose.model("WebhookEvent", webhookEventSchema);
