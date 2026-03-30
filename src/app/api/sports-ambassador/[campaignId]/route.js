import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Campaign from "@/models/Campaign";
import crypto from "crypto";

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:5200";

export async function GET(request, { params }) {
  const { campaignId } = await params;
  const { searchParams } = new URL(request.url);
  const athlete = searchParams.get("athlete");

  // Log incoming parameters for debugging

  // Validate inputs
  if (!campaignId) {
    console.error("Missing campaignId");
    return NextResponse.json({ error: "Missing campaignId" }, { status: 400 });
  }
  if (!athlete) {
    console.error("Missing athlete query parameter");
    return NextResponse.json(
      { error: "Missing athlete query parameter" },
      { status: 400 }
    );
  }

  // Connect to database
  try {
    await connectDB();
  } catch (error) {
    console.error("Database connection failed:", error.message);
    return NextResponse.json(
      { error: "Database connection failed" },
      { status: 500 }
    );
  }

  // Fetch campaign data
  const campaign = await Campaign.findOne({ trackingId: campaignId }).lean();
  if (!campaign) {
    console.error("Campaign not found for trackingId:", campaignId);
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  // Validate affiliateLinkDestination
  const affiliateLinkDestination =
    campaign.compensation?.affiliateLinkDestination;
  if (!affiliateLinkDestination || !isValidUrl(affiliateLinkDestination)) {
    console.error(
      "Invalid or missing affiliateLinkDestination:",
      affiliateLinkDestination
    );
    return NextResponse.json(
      { error: "Invalid affiliate link" },
      { status: 400 }
    );
  }

  // Generate visitorId
  const visitorId = `VIS_${crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase()}`;

  // Server-side click tracking
  try {
    const response = await fetch(`${BASE_URL}/api/click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId,
        athleteId: athlete,
        visitorId,
        eventType: "click",
        brandId: campaign.brandId?.toString() || "unknown",
      }),
    });
    if (!response.ok) {
      console.error("Server-side click tracking failed:", response.statusText);
    }
  } catch (error) {
    console.error("Server-side click tracking error:", error.message);
  }

  return NextResponse.json({
    campaign: {
      basics: campaign.basics,
      compensation: campaign.compensation,
      brandId: campaign.brandId?.toString() || "unknown",
    },
    visitorId,
    athlete,
  });
}

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
