import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import VisitorEvent from "@/models/VisitorEvent";
import Campaign from "@/models/Campaign";
import User from "@/models/User";

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
      ambassador,
      // Snapshots passed from client
      brandVatCountry: reqBrandVatCountry,
      brandVatStatus: reqBrandVatStatus,
      athleteVatCountry: reqAthleteVatCountry,
      athleteVatStatus: reqAthleteVatStatus,
    } = await req.json();

    if (!brandId || !campaignId || !visitorId || !eventType) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return NextResponse.json(
        { message: "Campaign not found" },
        { status: 404 }
      );
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

    // Skip creation if eventType is not conversion and ambassadorId is null
    if (!ambassadorId && eventType !== "conversion") {
      return NextResponse.json(
        { message: "Ambassador required for view/click events" },
        { status: 400 }
      );
    }

    // Capture/Verify VAT snapshots at event time
    let brandVatCountry = reqBrandVatCountry;
    let brandVatStatus = reqBrandVatStatus;
    let athleteVatCountry = reqAthleteVatCountry;
    let athleteVatStatus = reqAthleteVatStatus;

    try {
      if (!brandVatCountry || !brandVatStatus) {
        const brand = await User.findById(brandId);
        if (brand) {
          const brandVatDetails = brand.brand?.vatDetails || {};
          brandVatCountry = (brandVatDetails.vatCountry || brand.brand?.country || "").toString().toUpperCase();
          brandVatStatus = (brandVatDetails.vatStatus || "not_provided").toString().toLowerCase();
        }
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
      console.error("Error capturing VAT snapshots in visitor-event:", vatErr.message);
    }

    await VisitorEvent.create({
      campaignId,
      ambassadorId,
      brandId,
      visitorId,
      eventType,
      dropoffPoint: dropoffPoint || "",
      referrer: referrer || "",
      userAgent: userAgent || "",
      ipAddress: req.headers.get("x-forwarded-for") || req.ip || "",
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
    return NextResponse.json(
      { message: error.message || "Error tracking event" },
      { status: 500 }
    );
  }
}
