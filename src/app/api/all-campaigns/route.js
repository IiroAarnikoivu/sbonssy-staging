import { NextResponse } from "next/server";
import Campaign from "@/models/Campaign";
import CampaignInteraction from "@/models/CampaignInteraction";
import { connectDB } from "@/lib/db";

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);

    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Filters
    const filters = {
      type: searchParams.get("type"),
      isOngoing: searchParams.get("isOngoing"),
      minFollowers: searchParams.get("minFollowers"),
      maxFollowers: searchParams.get("maxFollowers"),
      platforms: searchParams.get("platforms"),
      contentType: searchParams.get("contentType"),
      brandName: searchParams.get("brandName"),
      sort: searchParams.get("sort") || "",
      category: searchParams.get("category")?.split(",") || [],
      offerType: searchParams.get("offerType"),
      search: searchParams.get("search"),
    };

    const query = {};

    // Search functionality
    if (filters.search) {
      const searchRegex = new RegExp(filters.search, "i");
      query.$or = [
        { "basics.title": searchRegex },
        { "basics.description": searchRegex },
      ];
    }

    if (filters.type && filters.type !== "all") {
      query["basics.campaignType"] = filters.type;
    }

    if (filters.isOngoing) {
      query["basics.isOngoing"] = filters.isOngoing === "true";
    }

    if (filters.contentType) {
      query["creatorProfile.contentStyle"] = {
        $regex: new RegExp(filters.contentType, "i"),
      };
    }

    if (filters.minFollowers || filters.maxFollowers) {
      const min = parseInt(filters.minFollowers || "0");
      const max = parseInt(
        filters.maxFollowers || `${Number.MAX_SAFE_INTEGER}`
      );
      query.$and = [
        { "creatorProfile.followerRange.min": { $lte: max } },
        { "creatorProfile.followerRange.max": { $gte: min } },
      ];
    }

    if (filters.platforms) {
      query["creatorProfile.platforms"] = {
        $in: filters.platforms.split(","),
      };
    }

    if (filters.category.length > 0) {
      query["basics.category"] = {
        $in: filters.category.map((cat) => new RegExp(cat, "i")),
      };
    }

    if (filters.offerType) {
      query["basics.offerType"] = {
        $regex: new RegExp(filters.offerType, "i"),
      };
    }

    // Exclude paused and ended campaigns
    const now = new Date();
    query.stateID = { $ne: 2 }; // 2 = Paused
    const ongoingOr = [
      { "basics.isOngoing": true },
      { "basics.endDate": { $gte: now } },
      { "basics.endDate": { $eq: null } },
    ];
    if (Array.isArray(query.$and)) {
      query.$and.push({ $or: ongoingOr });
    } else {
      query.$and = [{ $or: ongoingOr }];
    }

    // Sort
    let sortOption = {};
    switch (filters.sort) {
      case "createdAt-asc":
        sortOption["createdAt"] = 1;
        break;
      case "createdAt-desc":
        sortOption["createdAt"] = -1;
        break;
      case "brandName-asc":
        // We'll handle brand name sorting after fetching data
        sortOption["createdAt"] = -1; // Default sort
        break;
      case "brandName-desc":
        // We'll handle brand name sorting after fetching data
        sortOption["createdAt"] = -1; // Default sort
        break;
      default:
        // Default to latest (createdAt descending)
        sortOption["createdAt"] = -1;
    }

    // Initial query
    let campaigns = await Campaign.find(query)
      .populate("brandId")
      .sort(sortOption)
      .lean();

    // If search is present, also include campaigns whose brand matches (name/companyName)
    if (filters.search) {
      const brandSearchRegex = new RegExp(filters.search, "i");
      // Clone query and remove title/description search to allow brand-only matches
      const brandQuery = { ...query };
      if (brandQuery.$or) delete brandQuery.$or;

      const brandSide = await Campaign.find(brandQuery)
        .populate({
          path: "brandId",
          match: {
            $or: [
              { "brand.name": brandSearchRegex },
              { "brand.companyName": brandSearchRegex },
            ],
          },
        })
        .sort(sortOption)
        .lean();

      const brandMatched = brandSide.filter((c) => c.brandId);

      // Union unique by _id
      const map = new Map();
      for (const item of [...campaigns, ...brandMatched]) {
        map.set(item._id.toString(), item);
      }
      campaigns = Array.from(map.values());
    }

    // Brand name filter (brand.name or brand.companyName)
    if (filters.brandName) {
      const brandRegex = new RegExp(filters.brandName, "i");
      campaigns = campaigns.filter(
        (c) =>
          c.brandId &&
          c.brandId.brand &&
          ((c.brandId.brand.name && brandRegex.test(c.brandId.brand.name)) ||
            (c.brandId.brand.companyName &&
              brandRegex.test(c.brandId.brand.companyName)))
      );
    }

    // Handle brand name sorting (fallback to brand.name)
    if (filters.sort === "brandName-asc" || filters.sort === "brandName-desc") {
      campaigns.sort((a, b) => {
        const brandNameA =
          a.brandId?.brand?.companyName || a.brandId?.brand?.name || "";
        const brandNameB =
          b.brandId?.brand?.companyName || b.brandId?.brand?.name || "";

        if (filters.sort === "brandName-asc") {
          return brandNameA.localeCompare(brandNameB);
        } else {
          return brandNameB.localeCompare(brandNameA);
        }
      });
    }

    let filteredCampaigns = campaigns;
    // Only enforce interactions requirement when not searching
    if (!filters.search) {
      const allInteractions = await CampaignInteraction.find({
        status: { $in: ["pending", "accepted", "active"] },
      }).distinct("campaignId");
      filteredCampaigns = campaigns.filter((c) =>
        allInteractions.some((id) => id.toString() === c._id.toString())
      );
    }

    // Fetch ambassadors for those campaigns
    const campaignIds = filteredCampaigns.map((c) => c._id);
    const interactions = await CampaignInteraction.find({
      campaignId: { $in: campaignIds },
      status: { $in: ["pending", "accepted", "active"] },
    })
      .populate({ path: "userId" })
      .lean();

    // Group ambassadors by campaignId
    const ambassadorsMap = {};
    for (const interaction of interactions) {
      const id = interaction.campaignId.toString();
      if (!ambassadorsMap[id]) ambassadorsMap[id] = [];
      if (interaction.userId) ambassadorsMap[id].push(interaction.userId);
    }

    // Attach ambassadors and filter out empty ones
    const withAmbassadors = filteredCampaigns
      .map((c) => ({
        ...c,
        ambassadors: ambassadorsMap[c._id.toString()] || [],
      }))
      .filter((c) => c.ambassadors.length > 0);

    // Final pagination after filtering
    const total = withAmbassadors.length;
    const paginated = withAmbassadors.slice(skip, skip + limit);

    return NextResponse.json({
      success: true,
      total,
      data: paginated,
      pagination: { page, limit, total },
    });
  } catch (error) {
    console.error("Campaign fetch error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
