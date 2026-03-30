import mongoose from "mongoose";

// PaymentMethod Schema
const paymentMethodSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Index for faster queries by userId
    },
    stripeCustomerId: {
      type: String,
      required: true,
      index: true, // Index for Stripe customer ID
    },
    paymentMethodId: {
      type: String,
      required: true,
      unique: true, // Ensure no duplicate Stripe payment method IDs
    },
    last4: {
      type: String,
      required: true,
    },
    brand: {
      type: String,
      required: true,
    },
    exp_month: {
      type: Number,
      required: true,
    },
    exp_year: {
      type: Number,
      required: true,
    },
    isDefault: {
      type: Boolean,
      default: false, // Track if this is the default payment method
    },
  },
  { timestamps: true } // Adds createdAt and updatedAt fields
);

// Ensure unique index on paymentMethodId

export default mongoose.models.PaymentMethod ||
  mongoose.model("PaymentMethod", paymentMethodSchema);
