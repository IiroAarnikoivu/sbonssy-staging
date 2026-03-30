import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import Campaign from "@/models/Campaign";
import User from "@/models/User";
import { NextResponse } from "next/server";
import crypto from "crypto";
import CampaignInteraction from "@/models/CampaignInteraction";
import FavoriteCampaign from "@/models/FavoriteCampaign";
import FavoriteProduct from "@/models/FavoriteProduct";
import CampaignShare from "@/models/CampaignShare";
import { sendEmail } from "@/lib/sendEmail";

export async function POST(req) {
  try {
    await connectDB();
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const brandUser = await User.findOne({ supabaseId: user.id });
    if (!brandUser || brandUser.role !== "brand") {
      return NextResponse.json(
        { message: "Forbidden: Only brands can create campaigns" },
        { status: 403 },
      );
    }

    const rawData = await req.json();

    if (!rawData || typeof rawData !== "object") {
      return NextResponse.json(
        { message: "Invalid campaign data" },
        { status: 400 },
      );
    }

    const campaignId = `CMP_${crypto.randomBytes(4).toString("hex")}`;
    const trackingSnippet = `
      <script src="https://sbonssy.com/tracker.js" 
        data-brand="${brandUser.brand.tracking_key}" 
        data-campaign="${campaignId}">
      </script>
    `;

    const campaignData = {
      brandId: brandUser.invitedBy ? brandUser?.invitedBy : brandUser._id,
      trackingId: campaignId,
      stateID: 1,
      basics: {
        campaignType: rawData.basics?.campaignType || "public",
        coverImages: Array.isArray(rawData.assets?.logos)
          ? rawData.assets.logos.map((item) => ({
              url: String(item.url || ""),
              publicId: String(item.publicId || ""),
            }))
          : [],
        category: rawData.basics?.category || "apparel",
        title: String(rawData.basics?.title || ""),
        description: String(rawData.basics?.description || ""),
        campaign_url: String(rawData.basics?.campaign_url || ""),
        script_snippet: trackingSnippet,
        startDate: rawData.basics?.startDate
          ? new Date(rawData.basics.startDate)
          : null,
        endDate: rawData.basics?.isOngoing
          ? null
          : rawData.basics?.endDate
            ? new Date(rawData.basics.endDate)
            : null,
        isOngoing: Boolean(rawData.basics?.isOngoing),
        // targetRegions: Array.isArray(rawData.basics?.targetRegions)
        //   ? rawData.basics.targetRegions.filter((region) =>
        //       [
        //         "north_america",
        //         "europe",
        //         "asia",
        //         "africa",
        //         "south_america",
        //         "australia",
        //       ].includes(region)
        //     )
        //   : [],
        targetRegions: Array.isArray(rawData.basics?.targetRegions)
          ? rawData.basics.targetRegions
              .map((region) => {
                // Handle both string and object formats
                const value =
                  typeof region === "string" ? region : region?.value;
                return value && typeof value === "string"
                  ? value.replace(/"/g, "") // Remove any stray quotes
                  : null;
              })
              .filter(
                (region) =>
                  region &&
                  [
                    "north_america",
                    "europe",
                    "asia",
                    "africa",
                    "south_america",
                    "australia",
                  ].includes(region),
              )
          : [],
      },
      products: Array.isArray(rawData.products)
        ? rawData.products.map((product) => ({
            shopifyProductId: String(product.shopifyProductId || ""),
            handle: String(product.handle || ""),
            variantId: String(
              product.variantId || product.variants?.[0]?.id || "",
            ),
            name: String(product.name || ""),
            description: String(product.description || ""),
            price: String(product.price || "0.00"),
            currency: String(product.currency || "USD"),
            image: String(product.image || ""),
            onlineStoreUrl: String(product.onlineStoreUrl || ""),
          }))
        : [],
      tags: {
        enabled: true,
        events: [
          { eventName: "page_view", trigger: "page_load" },
          { eventName: "click", trigger: "click", selector: ".sbonssy-track" },
          { eventName: "purchase", trigger: "custom" },
        ],
      },
      creatorProfile: {
        followerRange: {
          min: Number(rawData.creatorProfile?.followerRange?.min) || 0,
          max: Number(rawData.creatorProfile?.followerRange?.max) || 0,
        },
        platforms: Array.isArray(rawData.creatorProfile?.platforms)
          ? rawData.creatorProfile.platforms.filter((p) =>
              [
                "instagram",
                "youtube",
                "tiktok",
                "twitter",
                "facebook",
              ].includes(p),
            )
          : [],
        ambassadorTypes: Array.isArray(rawData.creatorProfile?.ambassadorTypes)
          ? rawData.creatorProfile.ambassadorTypes.filter((t) =>
              [
                "athlete",
                "team",
                "influencer",
                "para-athlete",
                "coach",
                "ex-athlete",
              ].includes(t),
            )
          : [],
        contentRequirements: String(
          rawData.creatorProfile?.contentRequirements || "",
        ),
        requiresApproval: Boolean(rawData.creatorProfile?.requiresApproval),
      },
      compensation: {
        type: rawData.compensation?.type || "",
        commission:
          rawData.compensation?.type === "pay-per-sale"
            ? Math.max(0, Number(rawData.compensation?.commission) || 0)
            : 0,
        amount: ["pay-per-lead", "pay-per-click", "flat-fee"].includes(
          rawData.compensation?.type,
        )
          ? Math.max(0, Number(rawData.compensation?.amount) || 0)
          : 0,
        gifting: Boolean(rawData.compensation?.gifting),
        duration: rawData.compensation?.duration,
        affiliateLinkDestination:
          rawData.compensation?.affiliateLinkDestination,
      },
      assets: {
        logos: Array.isArray(rawData.basics?.coverImages)
          ? rawData.basics?.coverImages?.map((item) => ({
              url: String(item.url || ""),
              publicId: String(item.publicId || ""),
            }))
          : [],
        photos: Array.isArray(rawData.assets?.photos)
          ? rawData.assets.photos.map((item) => ({
              url: String(item.url || ""),
              publicId: String(item.publicId || ""),
            }))
          : [],
        videos: Array.isArray(rawData.assets?.videos)
          ? rawData.assets.videos.map((item) => ({
              url: String(item.url || ""),
              publicId: String(item.publicId || ""),
            }))
          : [],
        examplePosts: Array.isArray(rawData.assets?.examplePosts)
          ? rawData.assets.examplePosts.map((item) => ({
              url: String(item.url || ""),
              publicId: String(item.publicId || ""),
              mediaType: String(
                item.mediaType ||
                  (item.url?.includes("video") ? "video" : "image"),
              ),
            }))
          : [],
        styleGuide: {
          fonts: String(rawData.assets?.styleGuide?.fonts || ""),
          colors: String(rawData.assets?.styleGuide?.colors || ""),
          guidelines: String(rawData.assets?.styleGuide?.guidelines || ""),
        },
      },
      goals: {
        clicks: Math.max(0, Number(rawData.goals?.clicks) || 0),
        sales: Math.max(0, Number(rawData.goals?.sales) || 0),
        signups: Math.max(0, Number(rawData.goals?.signups) || 0),
        budgetCap: Math.max(0, Number(rawData.goals?.budgetCap) || 0),
        products: rawData.compensation?.gifting
          ? Array.isArray(rawData.goals?.products)
            ? rawData.goals.products.map((p) => ({
                name: String(p.name || ""),
                description: String(p.description || ""),
              }))
            : []
          : [],
        shippingRegions: rawData.compensation?.gifting
          ? Array.isArray(rawData.goals?.shippingRegions)
            ? rawData.goals.shippingRegions.filter((region) =>
                [
                  "north_america",
                  "europe",
                  "asia",
                  "africa",
                  "south_america",
                  "australia",
                ].includes(region),
              )
            : []
          : [],
        shippingRequirements: rawData.compensation?.gifting
          ? String(rawData.goals?.shippingRequirements || "")
          : "",
      },
      legal: {
        // termsAgreed: Boolean(rawData.legal?.termsAgreed),
        ftcDisclosure: rawData.legal?.ftcDisclosure !== false,
        customTerms: String(rawData.legal?.customTerms || ""),
      },
      status: "draft",
    };

    if (!campaignData.basics.title)
      throw new Error("Campaign title is required");
    if (!campaignData.basics.description)
      throw new Error("Campaign description is required");
    if (!campaignData.compensation.type)
      throw new Error("Compensation type is required");
    if (
      campaignData.compensation.type === "pay-per-sale" &&
      !campaignData.compensation.commission
    )
      throw new Error("Commission rate is required for Pay Per Sale");
    if (
      ["pay-per-lead", "pay-per-click", "flat-fee"].includes(
        campaignData.compensation.type,
      ) &&
      !campaignData.compensation.amount
    )
      throw new Error(
        `Payout amount is required for ${campaignData.compensation.type}`,
      );
    // if (!campaignData.legal.termsAgreed)
    //   throw new Error("You must agree to the terms and conditions");
    if (!campaignData.legal.customTerms)
      throw new Error("Campaign terms are required");
    if (
      campaignData.assets.logos.length === 0 ||
      campaignData.assets.logos.some((item) => !item.url || !item.publicId)
    )
      throw new Error("At least one valid logo is required");
    if (
      campaignData.compensation.gifting &&
      campaignData.goals.products.some((p) => !p.name)
    )
      throw new Error("Product name is required for all selected products");
    if (
      campaignData.assets.examplePosts.some(
        (item) => !item.url || !item.publicId || !item.mediaType,
      )
    )
      throw new Error(
        "Valid URL, publicId, and media type are required for all example posts",
      );

    // Server-side validation: commission must not exceed 100%
    if (
      campaignData.compensation?.type === "pay-per-sale" &&
      campaignData.compensation?.commission > 100
    ) {
      return NextResponse.json(
        { message: "Commission rate cannot exceed 100%" },
        { status: 400 },
      );
    }

    const campaign = await Campaign.create(campaignData);
    // Notify admins about new campaign creation (non-blocking)
    try {
      const brandName = brandUser?.brand?.companyName || "Unknown Brand";
      const title = campaign?.basics?.title || campaign.trackingId;
      const subject = `New campaign created: ${title}`;
      const adminDashboardUrl = "https://sbonssy.com/admin/campaigns";

      // Fetch admin users
      const adminUsers = await User.find({
        role: "admin",
        email: { $exists: true, $ne: "" },
      })
        .select("email")
        .lean();

      const fallbackAdminEmail = process.env.ADMIN_EMAIL;
      const recipients = (adminUsers?.map((a) => a.email) || []).filter(
        Boolean,
      );
      if (recipients.length === 0 && fallbackAdminEmail) {
        recipients.push(fallbackAdminEmail);
      }

      if (recipients.length === 0) {
        console.warn(
          "[CAMPAIGN][POST] No admin recipients found - skipping admin notification",
        );
      } else {
        for (const to of recipients) {
          await sendEmail({
            to,
            subject,
            text: `A new campaign '${title}' was created by '${brandName}'. Please review and test verification.`,
            html: `
              <div style="font-family: Arial, sans-serif; line-height: 1.6;  margin: 0; padding: 0;">
                <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <img src="https://res.cloudinary.com/dz2506ydg/image/upload/Sbonssy_logo_all_black_cprwob_ymbymj.png" alt="Sbonssy Logo" style="max-width: 200px; height: auto;">
                  <p>Hi Admin,</p>
                  <p>A new campaign <strong>${title}</strong> was created by <strong>${brandName}</strong>.</p>
                  <p>Please review the details and perform test verification.</p>
                  <a href="${adminDashboardUrl}" style="display: inline-block; padding: 10px 20px; background-color: #f26915; color: #fff; text-decoration: none; border-radius: 50px;">Open Admin</a>
                  <p style=" margin-top: 20px;">Best,<br>Team Sbonssy</p>
                </div>
              </div>
            `,
          });
        }
      }
    } catch (emailErr) {
      console.warn(
        "[CAMPAIGN][POST] Failed to send admin new-campaign email:",
        emailErr?.message || emailErr,
      );
    }

    return NextResponse.json(
      { message: "Campaign created successfully", campaign },
      { status: 201 },
    );
  } catch (error) {
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return NextResponse.json(
        { message: "Validation failed", errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      {
        message: error.message || "Error creating campaign",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: error.message.includes("required") ? 400 : 500 },
    );
  }
}
export async function GET(req) {
  try {
    await connectDB();
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const mongoUser = await User.findOne({ supabaseId: user.id }).lean();
    if (!mongoUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const brandId = searchParams.get("brandId");
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 20;
    const searchTerm = searchParams.get("search") || "";
    const categoryFilter = searchParams.get("category") || "all";
    const sortOption = searchParams.get("sort") || "latest";

    const skip = (page - 1) * limit;

    let query = {};
    let sort = {};

    // Build query based on user role and parameters
    if (
      brandId && mongoUser.role === "brand" && mongoUser.invitedBy
        ? mongoUser.invitedBy.toString() === brandId
        : mongoUser._id.toString() === brandId
    ) {
      query.brandId = brandId;
    } else {
      query["basics.campaignType"] = { $in: ["apply", "public"] };

      // Exclude campaigns where the user has an active, pending, or accepted interaction
      const excludedCampaigns = await CampaignInteraction.find({
        userId: mongoUser._id,
        status: { $in: ["active", "pending", "accepted"] },
      }).distinct("campaignId");

      if (excludedCampaigns.length > 0) {
        query._id = { $nin: excludedCampaigns };
      }

      // Ambassador-visible: only verified and active campaigns
      const now = new Date();
      query.stateID = 1; // only Active
      query["verification.status"] = "accepted"; // only Verified
      query.$and = [
        ...(query.$and || []),
        {
          $or: [
            { "basics.isOngoing": true },
            { "basics.endDate": { $gte: now } },
            { "basics.endDate": { $eq: null } },
          ],
        },
        {
          $or: [
            { "basics.startDate": { $lte: now } },
            { "basics.startDate": { $eq: null } },
          ],
        },
      ];
    }

    // Search by brand name, title, or description
    if (searchTerm) {
      query.$or = [
        { "basics.title": { $regex: searchTerm, $options: "i" } },
        { "basics.description": { $regex: searchTerm, $options: "i" } },
        {
          brandId: {
            $in: await User.find({
              "brand.companyName": { $regex: searchTerm, $options: "i" },
            }).distinct("_id"),
          },
        },
      ];
    }

    // Filter by campaign type
    if (categoryFilter !== "all") {
      query["basics.campaignType"] = categoryFilter.toLowerCase();
    }

    // Sort campaigns
    switch (sortOption) {
      case "latest":
        sort.createdAt = -1;
        break;
      case "newest":
        sort["basics.startDate"] = -1;
        break;
      case "oldest":
        sort["basics.startDate"] = 1;
        break;
      case "ending-soon":
        sort["basics.endDate"] = 1;
        break;
      case "a-z":
        sort["basics.title"] = 1;
        break;
      case "z-a":
        sort["basics.title"] = -1;
        break;
      default:
        sort.createdAt = -1; // Default sort by creation date (newest first)
        break;
    }

    const campaigns = await Campaign.find(query)
      .populate("brandId", "brand.companyName")
      .select(
        "basics assets status tags trackingId stateID products verification",
      )
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Campaign.countDocuments(query);

    const formattedCampaigns = campaigns.map((campaign) => {
      return {
        _id: campaign._id.toString(),
        trackingId: campaign.trackingId,
        basics: campaign.basics,
        assets: campaign.assets,
        products: campaign.products || [],
        brandId: campaign.brandId?._id.toString(),
        brandName: campaign.brandId?.brand?.companyName,
        status: campaign.status,
        tags: campaign.tags,
        stateID: campaign.stateID,
        verification: campaign.verification,
      };
    });

    return NextResponse.json(
      {
        data: formattedCampaigns,
        pagination: {
          currentPage: page,
          totalItems: total,
          limit: limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    await connectDB();
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const brandUser = await User.findOne({ supabaseId: user.id });

    if (
      !brandUser ||
      (brandUser.role !== "brand" && brandUser.role !== "admin")
    ) {
      return NextResponse.json(
        { message: "Forbidden: Only brands and admins can update campaigns" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get("campaignId");
    const rawData = await req.json();

    if (!campaignId) {
      return NextResponse.json(
        { message: "Campaign ID is required" },
        { status: 400 },
      );
    }

    const existingCampaign = await Campaign.findById(campaignId);
    if (!existingCampaign) {
      return NextResponse.json(
        { message: "Campaign not found" },
        { status: 404 },
      );
    }

    const isOwner =
      existingCampaign.brandId.toString() === brandUser._id.toString() ||
      brandUser?.role === "admin";
    const isInvitedByOwner =
      existingCampaign.brandId.toString() === String(brandUser.invitedBy);

    if (!isOwner && !isInvitedByOwner) {
      return NextResponse.json(
        { message: "Forbidden: You can only update your own campaigns" },
        { status: 403 },
      );
    }

    // Check if the request is only for updating stateID
    if (rawData && "stateID" in rawData && Object.keys(rawData).length === 1) {
      const updatedCampaign = await Campaign.findByIdAndUpdate(
        campaignId,
        { $set: { stateID: rawData.stateID } },
        { new: true },
      );

      // If campaign is paused (stateID: 2), clean up favorites and shares
      if (Number(rawData.stateID) === 2 && updatedCampaign) {
        try {
          const id = updatedCampaign._id;
          const trackingId = updatedCampaign.trackingId;

          await Promise.all([
            // 1. Remove from FavoriteCampaign
            FavoriteCampaign.deleteMany({ campaignId: id }),

            // 2. Remove from FavoriteProduct using trackingId
            FavoriteProduct.deleteMany({
              "productData.campaignTrackingId": trackingId,
            }),

            // 3. Remove from CampaignShare
            CampaignShare.deleteMany({ campaignId: id }),
          ]);
          console.log(`[CAMPAIGN][PAUSE] Robust cleanup successful for campaign: ${id}`);
        } catch (cleanupError) {
          console.warn("[CAMPAIGN][PAUSE] Cleanup failed:", cleanupError.message);
        }
      }

      return NextResponse.json(
        {
          message: "Campaign state updated successfully",
          campaign: updatedCampaign,
        },
        { status: 200 },
      );
    }

    // Existing logic for full campaign updates
    const campaignData = {
      basics: {
        campaignType:
          rawData.basics?.campaignType || existingCampaign.basics.campaignType,
        category: rawData.basics?.category || existingCampaign.basics.category,
        coverImages: Array.isArray(rawData.assets?.logos)
          ? rawData.assets?.logos?.map((item) => ({
              url: item?.url,
              publicId: item?.publicId,
            }))
          : existingCampaign?.assets?.logos,

        title: String(rawData.basics?.title || existingCampaign.basics.title),
        description: String(
          rawData.basics?.description || existingCampaign.basics.description,
        ),
        campaign_url: String(
          rawData.basics?.campaign_url || existingCampaign.basics.campaign_url,
        ),
        script_snippet: existingCampaign.basics.script_snippet,
        startDate: rawData.basics?.startDate
          ? new Date(rawData.basics.startDate)
          : existingCampaign.basics.startDate,
        endDate: rawData.basics?.isOngoing
          ? null
          : rawData.basics?.endDate
            ? new Date(rawData.basics.endDate)
            : existingCampaign.basics.endDate,
        isOngoing: Boolean(
          rawData.basics?.isOngoing ?? existingCampaign.basics.isOngoing,
        ),
        targetRegions: Array.isArray(rawData.basics?.targetRegions)
          ? rawData.basics.targetRegions
              .map((region) => {
                const value =
                  typeof region === "string" ? region : region?.value;
                return value && typeof value === "string"
                  ? value.replace(/"/g, "")
                  : null;
              })
              .filter(
                (region) =>
                  region &&
                  [
                    "north_america",
                    "europe",
                    "asia",
                    "africa",
                    "south_america",
                    "australia",
                  ].includes(region),
              )
          : existingCampaign.basics.targetRegions,
      },
      products: Array.isArray(rawData.products)
        ? rawData.products.map((product) => ({
            shopifyProductId: String(product.shopifyProductId || ""),
            handle: String(product.handle || ""),
            variantId: String(product.variantId || ""),
            name: String(product.name || ""),
            description: String(product.description || ""),
            price: String(product.price || "0.00"),
            currency: String(product.currency || "USD"),
            image: String(product.image || ""),
            onlineStoreUrl: String(product.onlineStoreUrl || ""),
          }))
        : existingCampaign.products || [],
      tags: {
        enabled: rawData.tags?.enabled ?? existingCampaign.tags.enabled,
        events: Array.isArray(rawData.tags?.events)
          ? rawData.tags.events.map((event) => ({
              eventName: String(event.eventName || ""),
              trigger: String(event.trigger || ""),
              selector: String(event.selector || ""),
              customScript: String(event.customScript || ""),
            }))
          : existingCampaign.tags.events,
      },
      creatorProfile: {
        followerRange: {
          min:
            Number(rawData.creatorProfile?.followerRange?.min) ||
            existingCampaign.creatorProfile.followerRange.min,
          max:
            Number(rawData.creatorProfile?.followerRange?.max) ||
            existingCampaign.creatorProfile.followerRange.max,
        },
        platforms: Array.isArray(rawData.creatorProfile?.platforms)
          ? rawData.creatorProfile.platforms.filter((p) =>
              [
                "instagram",
                "youtube",
                "tiktok",
                "twitter",
                "facebook",
              ].includes(p),
            )
          : existingCampaign.creatorProfile.platforms,
        ambassadorTypes: Array.isArray(rawData.creatorProfile?.ambassadorTypes)
          ? rawData.creatorProfile.ambassadorTypes.filter((t) =>
              [
                "athlete",
                "team",
                "influencer",
                "para-athlete",
                "coach",
                "ex-athlete",
              ].includes(t),
            )
          : existingCampaign.creatorProfile.ambassadorTypes,
        contentRequirements: String(
          rawData.creatorProfile?.contentRequirements ||
            existingCampaign.creatorProfile.contentRequirements,
        ),
      },
      compensation: {
        type: rawData.compensation?.type || existingCampaign.compensation.type,
        commission:
          rawData.compensation?.type === "pay-per-sale"
            ? Math.max(
                0,
                Number(rawData.compensation?.commission) ||
                  existingCampaign.compensation.commission,
              )
            : existingCampaign.compensation.commission,
        amount: ["pay-per-lead", "pay-per-click", "flat-fee"].includes(
          rawData.compensation?.type || existingCampaign.compensation.type,
        )
          ? Math.max(
              0,
              Number(rawData.compensation?.amount) ||
                existingCampaign.compensation.amount,
            )
          : existingCampaign.compensation.amount,
        gifting: Boolean(
          rawData.compensation?.gifting ??
          existingCampaign.compensation.gifting,
        ),
        duration:
          rawData.compensation?.duration ??
          existingCampaign.compensation.duration,
        affiliateLinkDestination:
          rawData.compensation?.affiliateLinkDestination ??
          existingCampaign?.compensation?.affiliateLinkDestination,
      },
      assets: {
        logos: Array.isArray(rawData.basics?.coverImages)
          ? rawData.basics?.coverImages?.map((item) => ({
              url: item?.url,
              publicId: item?.publicId,
            }))
          : existingCampaign?.basics?.coverImages,
        photos: Array.isArray(rawData.assets?.photos)
          ? rawData.assets.photos.map((item) => ({
              url: String(item.url || ""),
              publicId: String(item.publicId || ""),
            }))
          : existingCampaign.assets.photos,
        videos: Array.isArray(rawData.assets?.videos)
          ? rawData.assets.videos.map((item) => ({
              url: String(item.url || ""),
              publicId: String(item.publicId || ""),
            }))
          : existingCampaign.assets.videos,
        examplePosts: Array.isArray(rawData.assets?.examplePosts)
          ? rawData.assets.examplePosts.map((item) => ({
              url: String(item.url || ""),
              publicId: String(item.publicId || ""),
              mediaType: String(
                item.mediaType ||
                  (item.url?.includes("video") ? "video" : "image"),
              ),
            }))
          : existingCampaign.assets.examplePosts,
        styleGuide: {
          fonts: String(
            rawData.assets?.styleGuide?.fonts ||
              existingCampaign.assets.styleGuide.fonts,
          ),
          colors: String(
            rawData.assets?.styleGuide?.colors ||
              existingCampaign.assets.styleGuide.colors,
          ),
          guidelines: String(
            rawData.assets?.styleGuide?.guidelines ||
              existingCampaign.assets.styleGuide.guidelines,
          ),
        },
      },
      goals: {
        clicks: Math.max(
          0,
          Number(rawData.goals?.clicks) || existingCampaign.goals.clicks,
        ),
        sales: Math.max(
          0,
          Number(rawData.goals?.sales) || existingCampaign.goals.sales,
        ),
        signups: Math.max(
          0,
          Number(rawData.goals?.signups) || existingCampaign.goals.signups,
        ),
        budgetCap: Math.max(
          0,
          Number(rawData.goals?.budgetCap) || existingCampaign.goals.budgetCap,
        ),
        products: rawData.compensation?.gifting
          ? Array.isArray(rawData.goals?.products)
            ? rawData.goals.products.map((p) => ({
                name: String(p.name || ""),
                description: String(p.description || ""),
              }))
            : existingCampaign.goals.products
          : existingCampaign.goals.products,
        shippingRegions: rawData.compensation?.gifting
          ? Array.isArray(rawData.goals?.shippingRegions)
            ? rawData.goals.shippingRegions.filter((region) =>
                [
                  "north_america",
                  "europe",
                  "asia",
                  "africa",
                  "south_america",
                  "australia",
                ].includes(region),
              )
            : existingCampaign.goals.shippingRegions
          : existingCampaign.goals.shippingRegions,
        shippingRequirements: rawData.compensation?.gifting
          ? String(
              rawData.goals?.shippingRequirements ||
                existingCampaign.goals.shippingRequirements,
            )
          : existingCampaign.goals.shippingRequirements,
      },
      legal: {
        // termsAgreed: Boolean(
        //   rawData.legal?.termsAgreed ?? existingCampaign.legal.termsAgreed
        // ),
        ftcDisclosure:
          rawData.legal?.ftcDisclosure ?? existingCampaign.legal.ftcDisclosure,
        customTerms: String(
          rawData.legal?.customTerms || existingCampaign.legal.customTerms,
        ),
      },
    };

    // Server-side validation: commission must not exceed 100% on update
    if (
      campaignData.compensation?.type === "pay-per-sale" &&
      campaignData.compensation?.commission > 100
    ) {
      return NextResponse.json(
        { message: "Commission rate cannot exceed 100%" },
        { status: 400 },
      );
    }

    const updatedCampaign = await Campaign.findByIdAndUpdate(
      campaignId,
      { $set: campaignData },
      { new: true },
    );

    if (!updatedCampaign) {
      return NextResponse.json(
        { message: "Campaign not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "Campaign updated successfully", campaign: updatedCampaign },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        message: error.message || "Error updating campaign",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: error.message.includes("required") ? 400 : 500 },
    );
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const supabase = await createClient();
    await connectDB();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) {
      return NextResponse.json({ message: "unauthorised" }, { status: 401 });
    }
    const brandUser = await User.findOne({ supabaseId: user.id });
    if (
      !brandUser ||
      (brandUser.role !== "brand" && brandUser.role !== "admin")
    ) {
      return NextResponse.json(
        { message: "Forbidden: Only brands and admins can delete campaigns" },
        { status: 403 },
      );
    }
    const existingCampaign = await Campaign.findById(id);
    if (!existingCampaign) {
      return NextResponse.json(
        { message: "Campaign not found" },
        { status: 404 },
      );
    }

    const isOwner =
      existingCampaign.brandId.toString() === brandUser._id.toString();
    const isInvitedByOwner =
      existingCampaign.brandId.toString() === String(brandUser.invitedBy);

    if (!isOwner && !isInvitedByOwner) {
      return NextResponse.json(
        { message: "Forbidden: You can only delete your own campaigns" },
        { status: 403 },
      );
    }
    const deleted = await Campaign.findByIdAndDelete(id);

    // Cleanup: Remove all favorites and shares linked to this campaign
    try {
      if (deleted) {
        const trackingId = deleted.trackingId;

        // Parallel cleanup for better performance
        await Promise.all([
          // 1. Remove from FavoriteCampaign
          FavoriteCampaign.deleteMany({ campaignId: id }),

          // 2. Remove from FavoriteProduct using trackingId
          FavoriteProduct.deleteMany({
            "productData.campaignTrackingId": trackingId,
          }),

          // 3. Remove from CampaignShare
          CampaignShare.deleteMany({ campaignId: id }),
        ]);
      }
    } catch (cleanupError) {
      console.warn("[CAMPAIGN][DELETE] Cleanup failed:", cleanupError.message);
      // We don't fail the main request if cleanup fails, but we should log it
    }

    return NextResponse.json(
      { message: "Campaign deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Internal Sever Error", error: error.message },
      { status: 500 },
    );
  }
}
