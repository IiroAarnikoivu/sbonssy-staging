import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/helper";
import User from "@/models/User";
import Campaign from "@/models/Campaign";
import FavoriteProduct from "@/models/FavoriteProduct";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

/**
 * POST /api/shopify/disconnect-by-token
 *
 * Called by the Shopify app when a user disconnects their store.
 * Authenticates via shared JWT and clears brand.shopifyDetails from the main platform user.
 *
 * Body: { shopify_token: string }  — signed with the shared JWT_SECRET containing { userId }
 */
export async function POST(req) {
  try {
    await connectDB();

    const { shopify_token } = await req.json();

    if (!shopify_token) {
      return NextResponse.json({ message: "Token is required" }, { status: 400 });
    }

    const { valid, decoded, error } = await verifyToken(shopify_token);
    if (!valid) {
      return NextResponse.json({ message: error || "Invalid token" }, { status: 401 });
    }

    const userId = decoded?.userId;
    if (!userId) {
      return NextResponse.json({ message: "Token missing userId" }, { status: 400 });
    }

    // Clear shopifyDetails and shopify_token from the main user document
    const updated = await User.findByIdAndUpdate(
      userId,
      { $unset: { "brand.shopifyDetails": "" }, $set: { shopify_token: null } },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Also clean up the integration layer (User status and synced Products)
    // This is necessary even if triggered from Shopify App for thoroughness
    const shopifyUserDoc = await mongoose.connection.db
      .collection("User")
      .findOne({ mainPlatformUserId: userId.toString() });

    if (shopifyUserDoc) {
      const shopifyUserInternalId = shopifyUserDoc._id;

      await mongoose.connection.db
        .collection("Product")
        .deleteMany({ userId: shopifyUserInternalId });

      await mongoose.connection.db
        .collection("User")
        .updateOne(
          { _id: shopifyUserInternalId },
          { 
            $set: { 
              isConnected: false, 
              mainPlatformUserId: null,
              updatedAt: new Date()
            } 
          }
        );
      
      console.log(`[DISCONNECT_BY_TOKEN] Cleaned up integration User & Products for userId: ${userId}`);
    }

    // Delete campaigns with pay-per-sale and products
    // These campaigns are dependent on Shopify and should be removed when disconnected
    const deletedCampaigns = await Campaign.deleteMany({
      brandId: userId,
      "compensation.type": "pay-per-sale",
      "products.0": { $exists: true }
    });

    if (deletedCampaigns.deletedCount > 0) {
      console.log(`[DISCONNECT_BY_TOKEN] Deleted ${deletedCampaigns.deletedCount} campaigns for userId: ${userId}`);
    }

    // Delete favorite products associated with this brand
    // These products are synced from Shopify and should be removed from ambassador profiles
    const deletedFavorites = await FavoriteProduct.deleteMany({
      "productData.brandId": userId
    });

    if (deletedFavorites.deletedCount > 0) {
      console.log(`[DISCONNECT_BY_TOKEN] Deleted ${deletedFavorites.deletedCount} favorite products for userId: ${userId}`);
    }

    console.log(`[DISCONNECT_BY_TOKEN] Cleared brand.shopifyDetails for userId: ${userId}`);

    return NextResponse.json(
      { success: true, message: "Shopify store unlinked" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[DISCONNECT_BY_TOKEN] Error:", error);
    return NextResponse.json({ message: "Something went wrong", error: error.message }, { status: 500 });
  }
}
