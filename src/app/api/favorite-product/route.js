import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import FavoriteProduct from "@/models/FavoriteProduct";
import User from "@/models/User";
import Campaign from "@/models/Campaign";
import createClient from "@/lib/supabase/server";

export async function POST(request) {
  try {
    await connectDB();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { productId, productData, action } = await request.json();

    if (!productId) {
      return NextResponse.json(
        { message: "Product ID is required" },
        { status: 400 }
      );
    }

    if (!action || !["add", "remove"].includes(action)) {
      return NextResponse.json(
        { message: "Valid action (add/remove) is required" },
        { status: 400 }
      );
    }

    const mongoUser = await User.findOne({ supabaseId: user.id });
    if (!mongoUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Only sports-ambassadors can add products to profile
    if (mongoUser.role !== "sports-ambassador") {
      return NextResponse.json(
        { message: "Only sports ambassadors can manage product profiles" },
        { status: 403 }
      );
    }

    if (action === "add") {
      if (!productData) {
        return NextResponse.json(
          { message: "Product data is required for adding" },
          { status: 400 }
        );
      }

      // Check if already in favorites
      const existingFavorite = await FavoriteProduct.findOne({
        userId: mongoUser._id,
        productId,
      });

      if (existingFavorite) {
        // Update optional fields if provided so handle/campaignTrackingId are persisted
        const updates = {};
        if (productData) {
          if (typeof productData.handle === "string")
            updates["productData.handle"] = productData.handle;
          if (typeof productData.campaignTrackingId === "string")
            updates["productData.campaignTrackingId"] =
              productData.campaignTrackingId;
          if (productData.brandId)
            updates["productData.brandId"] = productData.brandId;
          if (typeof productData.image === "string")
            updates["productData.image"] = productData.image;
          if (typeof productData.name === "string")
            updates["productData.name"] = productData.name;
          if (typeof productData.description === "string")
            updates["productData.description"] = productData.description;
          if (typeof productData.price === "string")
            updates["productData.price"] = productData.price;
          if (typeof productData.currency === "string")
            updates["productData.currency"] = productData.currency;
        }

        if (Object.keys(updates).length > 0) {
          await FavoriteProduct.updateOne(
            { _id: existingFavorite._id },
            { $set: updates }
          );
        }

        const updated = await FavoriteProduct.findById(existingFavorite._id);
        return NextResponse.json(
          {
            message: "Product already in profile",
            success: true,
            action: "already_added",
            data: updated,
          },
          { status: 200 }
        );
      }

      // Resolve brand via mapping: Favorite.productId -> Product.userId -> User.mainPlatformUserId -> users._id
      let resolvedBrandId = null;
      try {
        const db = mongoose.connection.db;
        // First try by Shopify gid stored in Product.productId
        let productDoc = await db
          .collection("Product")
          .findOne({ productId: productId });

        // Fallback: if not found and productId is a valid ObjectId, try _id
        if (!productDoc) {
          let productObjectId = null;
          try {
            productObjectId = new mongoose.Types.ObjectId(productId);
          } catch (_) {
            productObjectId = null;
          }
          if (productObjectId) {
            productDoc = await db
              .collection("Product")
              .findOne({ _id: productObjectId });
          }
        }

        if (productDoc?.userId) {
          const shopDoc = await db
            .collection("User")
            .findOne({ _id: productDoc.userId });
          const mainPlatformUserId = shopDoc?.mainPlatformUserId; // string id of brand in users
          if (mainPlatformUserId) {
            try {
              const brandObjectId = new mongoose.Types.ObjectId(
                String(mainPlatformUserId)
              );
              const brandDoc = await db
                .collection("users")
                .findOne({ _id: brandObjectId }, { projection: { _id: 1 } });
              if (brandDoc?._id) {
                resolvedBrandId = brandDoc._id;
              }
            } catch (_) {
              // ignore invalid brand id format
            }
          }
        }
      } catch (_) {
        // ignore lookup failures
      }

      const favorite = await FavoriteProduct.create({
        userId: mongoUser._id,
        productId,
        productData: {
          shopifyProductId: productData.shopifyProductId || productId,
          name: productData.name || "Untitled Product",
          description: productData.description || "",
          price: productData.price || "0.00",
          currency: productData.currency || "USD",
          image: productData.image || "",
          handle: productData.handle || "",
          campaignTrackingId: productData.campaignTrackingId || "",
          brandId: productData.brandId || resolvedBrandId || null,
          onlineStoreUrl: productData.onlineStoreUrl || (productData.handle && productData.brandId ? "" : ""), // We can't easily construct it here without the domain, but the frontend should provide it now.
        },
      });

      return NextResponse.json(
        {
          message: "Product added to profile",
          data: favorite,
          success: true,
          action: "added",
        },
        { status: 200 }
      );
    } else if (action === "remove") {
      const result = await FavoriteProduct.deleteOne({
        userId: mongoUser._id,
        productId,
      });

      if (result.deletedCount === 0) {
        return NextResponse.json(
          { message: "Product not found in profile" },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          message: "Product removed from profile",
          success: true,
          action: "removed",
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ message: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Favorite product error:", error);
    return NextResponse.json(
      {
        message: "Server error",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectDB();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const mongoUser = await User.findOne({ supabaseId: user.id });
    if (!mongoUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Only sports-ambassadors can view their product profiles
    if (mongoUser.role !== "sports-ambassador") {
      return NextResponse.json(
        { message: "Only sports ambassadors can access product profiles" },
        { status: 403 }
      );
    }

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
        let brandId = fav?.productData?.brandId || null;
        let brandName = "";

        try {
          // If no stored brandId, resolve through Product -> User -> users
          if (!brandId) {
            const candidateIds = [
              fav?.productData?.shopifyProductId,
              fav?.productId,
            ].filter(Boolean);

            let productDoc = null;
            // Try by Shopify gid first
            for (const pid of candidateIds) {
              productDoc = await db
                .collection("Product")
                .findOne({ productId: pid });
              if (productDoc) break;
            }

            // Fallback to _id lookup if not found
            if (!productDoc) {
              for (const pid of candidateIds) {
                try {
                  const objId = new mongoose.Types.ObjectId(pid);
                  productDoc = await db
                    .collection("Product")
                    .findOne({ _id: objId });
                  if (productDoc) break;
                } catch (_) {}
              }
            }

            if (productDoc?.userId) {
              const shopDoc = await db
                .collection("User")
                .findOne({ _id: productDoc.userId });
              const mainPlatformUserId = shopDoc?.mainPlatformUserId;
              if (mainPlatformUserId) {
                try {
                  const brandObjectId = new mongoose.Types.ObjectId(
                    String(mainPlatformUserId)
                  );
                  const brandDoc = await db
                    .collection("users")
                    .findOne(
                      { _id: brandObjectId },
                      { projection: { _id: 1, name: 1, brand: 1 } }
                    );
                  if (brandDoc?._id) {
                    brandId = brandDoc._id;
                    // persist for faster future reads
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

          // If we have brandId but not name yet, fetch name
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
          // swallow errors to not block response
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
