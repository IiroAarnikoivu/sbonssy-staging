// models/FavoriteProduct.js
import mongoose from "mongoose";

const favoriteProductSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    productId: {
      type: String,
      required: true,
    },
    productData: {
      shopifyProductId: {
        type: String,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      description: {
        type: String,
        default: "",
      },
      price: {
        type: String,
        default: "0.00",
      },
      currency: {
        type: String,
        default: "USD",
      },
      image: {
        type: String,
        default: "",
      },
      // Optional fields to support per-product sharing from profile
      handle: {
        type: String,
        default: "",
      },
      variantId: {
        type: String,
        default: "",
      },
      campaignTrackingId: {
        type: String,
        default: "",
      },
      brandId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      onlineStoreUrl: {
        type: String,
        default: "",
      },
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Ensure unique combination of userId and productId
favoriteProductSchema.index({ userId: 1, productId: 1 }, { unique: true });

// Index for efficient queries
favoriteProductSchema.index({ userId: 1 });
favoriteProductSchema.index({ productId: 1 });

export default mongoose.models.FavoriteProduct ||
  mongoose.model("FavoriteProduct", favoriteProductSchema);
