import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import FavoriteProduct from "@/models/FavoriteProduct";
import User from "@/models/User";
import Campaign from "@/models/Campaign";
import createClient from "@/lib/supabase/server";

export async function GET(request, { params }) {
  try {
    const { id: supabaseId } = await params;

    await connectDB();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // if (!user?.id) {
    //   return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    // }

    const mongoUser = await User.findOne({ supabaseId });
    if (!mongoUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Only sports-ambassadors can view their product profiles
    // if (mongoUser.role !== "sports-ambassador") {
    //   return NextResponse.json(
    //     { message: "Only sports ambassadors can access product profiles" },
    //     { status: 403 }
    //   );
    // }

    const favorites = await FavoriteProduct.find({
      userId: mongoUser._id,
    }).sort({ createdAt: -1 });

    // Filter out products from paused campaigns (stateID = 2)
    const trackingIds = [...new Set(favorites.map(f => f.productData?.campaignTrackingId).filter(Boolean))];
    const campaigns = await Campaign.find({ trackingId: { $in: trackingIds } }, 'trackingId stateID');
    const pausedTrackingIds = new Set(campaigns.filter(c => c.stateID === 2).map(c => c.trackingId));
    
    // Filter out draft products
    const db = mongoose.connection.db;
    const favoriteProductIds = favorites.map(f => f.productId || f.productData?.shopifyProductId).filter(Boolean);
    const draftProducts = await db.collection("Product").find({ 
      shopifyProductId: { $in: favoriteProductIds },
      status: "DRAFT" 
    }).project({ shopifyProductId: 1 }).toArray();
    const draftProductIds = new Set(draftProducts.map(p => p.shopifyProductId));

    const activeFavorites = favorites.filter(f => {
      const pid = f.productId || f.productData?.shopifyProductId;
      return !draftProductIds.has(pid) && !pausedTrackingIds.has(f.productData?.campaignTrackingId);
    });
    const enriched = await Promise.all(
      activeFavorites.map(async (fav) => {
        let brandId;
        let brandName = "";

        try {
          if (!brandId) {
            let productObjectId = null;
            try {
              productObjectId = fav.productId;
            } catch (_) {
              productObjectId = null;
            }
            if (productObjectId) {
              const productDoc = await db
                .collection("Product")
                .findOne({ shopifyProductId: productObjectId });
              if (productDoc?.userId) {
                const shopDoc = await db
                  .collection("User")
                  .findOne({ _id: productDoc.userId });
                const mainPlatformUserId = shopDoc?.mainPlatformUserId;

                if (mainPlatformUserId) {
                  try {
                    const brandObjectId = String(mainPlatformUserId);

                    const brandDoc = await User.findOne(
                      { _id: brandObjectId }
                      // { projection: { _id: 1, name: 1, brand: 1 } }
                    );

                    if (brandDoc?._id) {
                      brandId = brandDoc._id;
                      await FavoriteProduct.updateOne(
                        { _id: fav._id },
                        { $set: { "productData.brandId": brandId } }
                      );
                      brandName =
                        brandDoc?.brand?.companyName ||
                        brandDoc?.brand?.name ||
                        brandDoc?.name ||
                        "";
                    }
                  } catch (_) {
                    // ignore invalid brand id
                  }
                }
              }
            }
          }

          if (brandId && !brandName) {
            const brandDoc = await db
              .collection("users")
              .findOne(
                { _id: new mongoose.Types.ObjectId(String(brandId)) },
                { projection: { name: 1, brand: 1 } }
              );
            brandName =
              brandDoc?.brand?.companyName ||
              brandDoc?.brand?.name ||
              brandDoc?.name ||
              "";
          }
        } catch (_) {
          // ignore resolution errors
        }

        const obj = fav.toObject();
        return {
          ...obj,
          resolvedBrand: {
            brandId: brandId || null,
            brandName,
          },
        };
      })
    );

    return NextResponse.json(
      {
        message: "Favorite products retrieved successfully",
        data: enriched,
        success: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get favorite products error:", error);
    return NextResponse.json(
      {
        message: "Server error",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
