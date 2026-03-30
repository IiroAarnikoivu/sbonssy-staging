const mongoose = require("mongoose");

const PaymentErrorSchema = new mongoose.Schema(
  {
    // Core identifiers
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
      index: true,
    },
    athleteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // May not always be available
      index: true,
    },
    visitorId: {
      type: String,
      required: false, // May not always be available
      index: true,
    },

    // Invoice and payment details
    invoiceId: {
      type: String,
      required: true,
      index: true,
    },
    stripeInvoiceId: {
      type: String,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      default: "EUR",
    },

    // Error details
    errorReason: {
      type: String,
      required: true,
      enum: [
        "no_default_payment_method",
        "payment_method_declined",
        "insufficient_funds",
        "payment_method_expired",
        "authentication_required",
        "stripe_error",
        "network_error",
        "unknown_error",
        "customer_not_found",
        "invoice_not_found",
        "payment_already_succeeded",
        "payment_intent_failed",
        "card_declined",
        "processing_error",
      ],
      index: true,
    },
    errorMessage: {
      type: String,
      required: true,
    },
    errorCode: {
      type: String,
      required: false, // Stripe error codes
    },

    // Retry information
    retryCount: {
      type: Number,
      default: 0,
    },
    lastRetryAt: {
      type: Date,
      required: false,
    },
    nextRetryAt: {
      type: Date,
      required: false,
    },
    resolved: {
      type: Boolean,
      default: false,
      index: true,
    },
    resolvedAt: {
      type: Date,
      required: false,
    },

    // Context information
    paymentContext: {
      type: String,
      enum: ["cron_automatic", "manual_retry", "api_request", "test_mode"],
      default: "cron_automatic",
    },

    // Additional metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: "payment_errors",
  }
);

// Indexes for efficient querying
PaymentErrorSchema.index({ brandId: 1, resolved: 1 });
PaymentErrorSchema.index({ campaignId: 1, createdAt: -1 });
PaymentErrorSchema.index({ errorReason: 1, resolved: 1 });
PaymentErrorSchema.index({ createdAt: -1 });

// Static methods
PaymentErrorSchema.statics.createPaymentError = async function (errorData) {
  try {
    const paymentError = new this(errorData);
    await paymentError.save();
    return paymentError;
  } catch (error) {
    console.error("Failed to create payment error record:", error);
    return null;
  }
};

PaymentErrorSchema.statics.getUnresolvedErrors = async function (
  brandId = null
) {
  const query = { resolved: false };
  if (brandId) {
    query.brandId = brandId;
  }
  return this.find(query).sort({ createdAt: -1 });
};

PaymentErrorSchema.statics.markAsResolved = async function (errorId) {
  return this.findByIdAndUpdate(
    errorId,
    {
      resolved: true,
      resolvedAt: new Date(),
    },
    { new: true }
  );
};

// Instance methods
PaymentErrorSchema.methods.incrementRetry = function () {
  this.retryCount += 1;
  this.lastRetryAt = new Date();
  // Set next retry for 1 hour later
  this.nextRetryAt = new Date(Date.now() + 60 * 60 * 1000);
  return this.save();
};

const PaymentError = mongoose.model("PaymentError", PaymentErrorSchema);

module.exports = PaymentError;
