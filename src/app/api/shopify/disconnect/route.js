import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import User from "@/models/User";
import Campaign from "@/models/Campaign";
import FavoriteProduct from "@/models/FavoriteProduct";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

/**
 * POST /api/shopify/disconnect
 *
 * Disconnects the authenticated brand user's Shopify store.
 * - Clears `brand.shopifyDetails` and `shopify_token` from the main user record.
 * - Deletes the linked shop user and all its synced products from the Shopify integration tables.
 * - Optionally passes `myshopifyDomain` to also trigger a disconnect on the Shopify app side.
 *
 * @param {Request} req
 * @returns {NextResponse}
 */
export async function POST(req) {
  try {
    await connectDB();

    // Authenticate the caller via Supabase session
    const supabase = await createClient();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Find the main platform user
    let user = await User.findOne({ supabaseId: authUser.id });
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // If this user is an invited brand member, operate on the owner's account
    const targetId = user.invitedBy ? user.invitedBy : user._id;
    const targetUser = user.invitedBy
      ? await User.findById(user.invitedBy)
      : user;

    if (!targetUser) {
      return NextResponse.json({ message: "Brand owner not found" }, { status: 404 });
    }

    const mainPlatformUserId = targetId.toString();

    // 1. Remove Shopify shop record and all its synced products from the integration tables
    const shopifyUserDoc = await mongoose.connection.db
      .collection("User")
      .findOne({ mainPlatformUserId });

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
    }

    // 2. Clear Shopify details and token from the main user record
    await User.findByIdAndUpdate(targetId, {
      $unset: { "brand.shopifyDetails": "" },
      $set: { shopify_token: null },
    });

    // 3. Delete campaigns with pay-per-sale and products
    // These campaigns are dependent on Shopify and should be removed when disconnected
    const deletedCampaigns = await Campaign.deleteMany({
      brandId: targetId,
      "compensation.type": "pay-per-sale",
      "products.0": { $exists: true }
    });

    if (deletedCampaigns.deletedCount > 0) {
      console.log(`[API_SHOPIFY_DISCONNECT] Deleted ${deletedCampaigns.deletedCount} campaigns for brand: ${targetId}`);
    }

    // 4. Delete favorite products associated with this brand
    // These products are synced from Shopify and should be removed from ambassador profiles
    const deletedFavorites = await FavoriteProduct.deleteMany({
      "productData.brandId": targetId
    });

    if (deletedFavorites.deletedCount > 0) {
      console.log(`[API_SHOPIFY_DISCONNECT] Deleted ${deletedFavorites.deletedCount} favorite products for brand: ${targetId}`);
    }

    return NextResponse.json(
      { success: true, message: "Shopify store disconnected and data cleared" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[API_SHOPIFY_DISCONNECT] Error:", error);
    return NextResponse.json(
      { message: "Something went wrong", error: error.message },
      { status: 500 }
    );
  }
}
