import { connectDB } from "@/lib/db";
import VisitorEvent from "@/models/VisitorEvent";
import Campaign from "@/models/Campaign";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const ambassadorTrackingKey = searchParams.get("athlete");
    const campaignTrackingId = searchParams.get("campaign");
    const visitorId = searchParams.get("visitorId");
    
    // Snapshots passed from landing page
    const reqBrandVatCountry = searchParams.get("brandVatCountry");
    const reqBrandVatStatus = searchParams.get("brandVatStatus");
    const reqAthleteVatCountry = searchParams.get("athleteVatCountry");
    const reqAthleteVatStatus = searchParams.get("athleteVatStatus");

    if (!ambassadorTrackingKey || !campaignTrackingId || !visitorId) {
      return new NextResponse(null, {
        status: 200,
        headers: { "Content-Type": "image/gif" },
      });
    }

    const campaign = await Campaign.findOne({ trackingId: campaignTrackingId });
    if (!campaign) {
      return new NextResponse(null, {
        status: 200,
        headers: { "Content-Type": "image/gif" },
      });
    }

    const ambassador = await User.findOne({
      $or: [
        { "athlete.tracking_key": ambassadorTrackingKey },
        { "team.tracking_key": ambassadorTrackingKey },
        { "influencer.tracking_key": ambassadorTrackingKey },
        { "coach.tracking_key": ambassadorTrackingKey },
        { "exAthlete.tracking_key": ambassadorTrackingKey },
        { "paraAthlete.tracking_key": ambassadorTrackingKey },
      ],
    });

    if (!ambassador) {
      return new NextResponse(null, {
        status: 200,
        headers: { "Content-Type": "image/gif" },
      });
    }

    // Capture/Verify VAT snapshots at event time
    let brandVatCountry = reqBrandVatCountry;
    let brandVatStatus = reqBrandVatStatus;
    let athleteVatCountry = reqAthleteVatCountry;
    let athleteVatStatus = reqAthleteVatStatus;

    try {
      if (!brandVatCountry || !brandVatStatus) {
        const brand = await User.findById(campaign.brandId);
        if (brand) {
          const brandVatDetails = brand.brand?.vatDetails || {};
          brandVatCountry = (brandVatDetails.vatCountry || brand.brand?.country || "").toString().toUpperCase();
          brandVatStatus = (brandVatDetails.vatStatus || "not_provided").toString().toLowerCase();
        }
      }

      if (!athleteVatCountry || !athleteVatStatus) {
        const athlete = ambassador; // already loaded at line 30
        const subRole = athlete.subRole || "athlete";
        const subRoleCamel = subRole.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        const athleteProfile = athlete[subRoleCamel];
        const athleteVatDetails = athleteProfile?.vatDetails || {};
        athleteVatCountry = (
          athleteVatDetails.vatCountry ||
          athleteVatDetails.registrationCountry ||
          athleteProfile?.vatCountry ||
          athleteProfile?.registrationCountry ||
          ""
        ).toString().toUpperCase();
        // Derive athleteVatStatus from vatStatus or uiBusinessType
        athleteVatStatus = (
          athleteVatDetails.vatStatus || 
          athleteVatDetails.uiBusinessType || 
          athleteProfile?.vatStatus || 
          athleteProfile?.uiBusinessType || 
          "not_provided"
        ).toString().toLowerCase();
      }
    } catch (vatErr) {
      console.error("Error capturing VAT snapshots in pixel API:", vatErr.message);
    }

    await VisitorEvent.create({
      campaignId: campaign._id,
      athleteId: ambassador._id,
      brandId: campaign.brandId,
      visitorId,
      eventType: "page_view",
      referrer: req.headers.get("referer") || "",
      userAgent: req.headers.get("user-agent") || "",
      ipAddress: req.headers.get("x-forwarded-for") || req.ip || "",
      // Snapshots
      brandVatCountry,
      brandVatStatus,
      athleteVatCountry,
      athleteVatStatus,
    });

    const gif = Buffer.from(
      "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      "base64"
    );
    return new NextResponse(gif, {
      status: 200,
      headers: { "Content-Type": "image/gif" },
    });
  } catch (error) {
    console.error("Error in /api/pixel:", error.message);
    return new NextResponse(null, {
      status: 200,
      headers: { "Content-Type": "image/gif" },
    });
  }
}
