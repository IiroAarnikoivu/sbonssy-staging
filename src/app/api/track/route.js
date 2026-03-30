// app/api/track/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import VisitorEvent from "@/models/VisitorEvent";
import Campaign from "@/models/Campaign";
import User from "@/models/User";
import createClient from "@/lib/supabase/server";

export async function POST(req) {
  try {
    await connectDB();
    const {
      brandId,
      campaignId,
      visitorId,
      eventType,
      dropoffPoint,
      referrer,
      userAgent,
      ipAddress,
      eventData,
      ambassador,
      // Snapshots passed from client
      brandVatCountry: reqBrandVatCountry,
      brandVatStatus: reqBrandVatStatus,
      athleteVatCountry: reqAthleteVatCountry,
      athleteVatStatus: reqAthleteVatStatus,
    } = await req.json();

    // Validate required fields
    if (!brandId || !campaignId || !visitorId || !eventType) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Find campaign by trackingId or _id
    const campaign = await Campaign.findOne({
      $or: [{ trackingId: campaignId }, { _id: campaignId }],
    });
    if (!campaign) {
      return NextResponse.json(
        { message: "Campaign not found" },
        { status: 404 }
      );
    }

    // Validate brand
    const brand = await User.findById(brandId);
    if (!brand || brand.role !== "brand") {
      console.error("Invalid brand ID:", { brandId });
      return NextResponse.json(
        { message: "Invalid brand ID" },
        { status: 400 }
      );
    }

    // Check if the user is authenticated
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    let userId = null;
    let finalVisitorId = visitorId;

    if (user && !authError) {
      const mongoUser = await User.findOne({ supabaseId: user.id });
      if (mongoUser) {
        if (
          mongoUser.role === "brand" &&
          ["page_view", "click"].includes(eventType)
        ) {
          return NextResponse.json(
            { message: "Event not tracked for brand users" },
            { status: 200 }
          );
        }
        finalVisitorId = user.id; // Use supabaseId for authenticated users
        userId = mongoUser._id; // Store for reference
      }
    }

    let ambassadorId = null;
    if (ambassador) {
      const ambassadorData = await User.findOne({
        $or: [
          { "athlete.tracking_key": ambassador },
          { "team.tracking_key": ambassador },
          { "influencer.tracking_key": ambassador },
          { "coach.tracking_key": ambassador },
          { "exAthlete.tracking_key": ambassador },
          { "paraAthlete.tracking_key": ambassador },
        ],
      });
      ambassadorId = ambassadorData?._id || null;
    }

    // Allow clicks without ambassadorId (optional)
    if (!ambassadorId && eventType === "click") {
      console.debug(
        "Click event without ambassador, proceeding without ambassadorId"
      );
    }

    // Check uniqueness for click and page_view events
    if (["click", "page_view"].includes(eventType)) {
      const existingEvent = await VisitorEvent.findOne({
        campaignId: campaign._id,
        athleteId: ambassadorId || null,
        visitorId: finalVisitorId,
        eventType,
      });

      if (existingEvent) {
        return NextResponse.json(
          { message: `${eventType} already recorded for this visitor` },
          { status: 200 }
        );
      }
    }

    // Capture/Verify VAT snapshots at event time
    let brandVatCountry = reqBrandVatCountry;
    let brandVatStatus = reqBrandVatStatus;
    let athleteVatCountry = reqAthleteVatCountry;
    let athleteVatStatus = reqAthleteVatStatus;

    try {
      if (!brandVatCountry || !brandVatStatus) {
        // brand user is already loaded at line 45
        const brandVatDetails = brand.brand?.vatDetails || {};
        brandVatCountry = (brandVatDetails.vatCountry || brand.brand?.country || "").toString().toUpperCase();
        brandVatStatus = (brandVatDetails.vatStatus || "not_provided").toString().toLowerCase();
      }

      if (!athleteVatCountry || !athleteVatStatus) {
        if (ambassadorId) {
          const athlete = await User.findById(ambassadorId);
          if (athlete) {
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
        }
      }
    } catch (vatErr) {
      console.error("Error capturing VAT snapshots in track:", vatErr.message);
    }

    // Record the event
    const data = await VisitorEvent.create({
      campaignId: campaign._id,
      athleteId: ambassadorId,
      brandId: brand._id,
      visitorId: finalVisitorId,
      userId,
      eventType,
      dropoffPoint: dropoffPoint || "",
      referrer: referrer || "",
      userAgent: userAgent || "",
      ipAddress:
        req.headers.get("x-forwarded-for") || ipAddress || req.ip || "",
      eventData: eventData || {},
      timestamp: new Date(),
      // Snapshots
      brandVatCountry,
      brandVatStatus,
      athleteVatCountry,
      athleteVatStatus,
    });

    return NextResponse.json(
      { message: "Event tracked successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error tracking event:", error.message, error.stack);
    return NextResponse.json(
      { message: error.message || "Error tracking event" },
      { status: 500 }
    );
  }
}
