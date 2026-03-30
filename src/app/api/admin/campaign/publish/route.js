import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Campaign from "@/models/Campaign";
import createClient from "@/lib/supabase/server";
import User from "@/models/User";
import { sendEmail } from "@/lib/sendEmail";

// POST: publish/accept campaign if tracking verification is complete
// Body: { campaignId (Mongo _id) | trackingId }
export async function POST(req) {
  try {
    // AuthN (reuse existing pattern)
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json(
        { message: "Unauthorized", messageKey: "unauthorized" },
        { status: 401 },
      );

    await connectDB();
    const { campaignId, trackingId } = await req.json();
    const campaign = trackingId
      ? await Campaign.findOne({ trackingId })
      : await Campaign.findById(campaignId);

    if (!campaign) {
      return NextResponse.json(
        { message: "Campaign not found", messageKey: "campaignNotFound" },
        { status: 404 },
      );
    }

    // Require verified tracking before publish
    if (campaign?.verification?.status !== "verified") {
      return NextResponse.json(
        {
          message: "Tracking must be verified before publishing",
          messageKey: "trackingNotVerified",
        },
        { status: 400 },
      );
    }

    // Load brand for webhook checks and notifications
    const brand = await User.findById(campaign.brandId);
    if (!brand) {
      return NextResponse.json(
        {
          message: "Brand not found for this campaign",
          messageKey: "brandNotFound",
        },
        { status: 404 },
      );
    }

    // For non pay-per-click campaigns, require webhook configuration before acceptance
    const compType = campaign?.compensation?.type;
    const webhookConfigured = brand.brand?.isWebhookConfigured;

    // Condition: Brand is connected to Shopify and campaign has products (for PPS)
    const isShopifyConnected = !!brand.brand?.shopifyDetails?.myShopifyDomain;
    const hasProducts = campaign?.products?.length > 0;
    const isPPSWithProductsAndShopify =
      compType === "pay-per-sale" && hasProducts && isShopifyConnected;

    if (
      compType !== "pay-per-click" &&
      !webhookConfigured &&
      !isPPSWithProductsAndShopify
    ) {
      const dashboardUrl = (
        process.env.NEXTAUTH_URL || "http://localhost:3000"
      ).replace(/\/$/, "");

      try {
        if (brand.email) {
          await sendEmail({
            to: brand.email,
            subject: "Action needed: Configure your webhook",
            html: `
              <div style="font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0;">
                <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <img src="https://res.cloudinary.com/dz2506ydg/image/upload/Sbonssy_logo_all_black_cprwob_ymbymj.png" alt="Sbonssy Logo" style="max-width: 200px; height: auto;">
                  <p>Hi ${brand.brand?.companyName || "there"},</p>
                  <p>Your campaign <strong>${campaign?.basics?.title || campaign.trackingId}</strong> is pending publish. Please configure your webhook integration and send a successful test event to activate it.</p>
                  <p>Steps:</p>
                  <ol>
                    <li>Go to your webhook settings: <a href="${dashboardUrl}/brand/settings/webhooks">Webhook settings</a></li>
                    <li>Copy the conversion endpoint and API key</li>
                    <li>Implement the webhook in your system and send a test event</li>
                  </ol>
                  <p>Once a test succeeds, we'll mark your webhook as configured and the admin can publish your campaign.</p>
                  <p style="margin-top: 20px;">Best,<br>Team Sbonssy</p>
                </div>
              </div>
            `,
          });
        }
      } catch (emailErr) {
        console.warn(
          "Failed to send webhook configuration email:",
          emailErr?.message || emailErr,
        );
      }

      return NextResponse.json(
        {
          message:
            "Webhook must be configured and tested before publishing non pay-per-click campaigns",
          messageKey: "webhookRequired",
        },
        { status: 400 },
      );
    }

    // Set stateID to Published (1) and mark verification as accepted
    campaign.stateID = 1;
    campaign.verification = {
      ...(campaign.verification || {}),
      status: "accepted",
    };
    await campaign.save();

    // Notify brand owner that the campaign has been published (accepted)
    try {
      if (brand?.email) {
        const dashboardUrl =
          (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(
            /\/$/,
            "",
          ) + "/brand/campaign";
        await sendEmail({
          to: brand.email,
          subject: `Congratulations! Your campaign ${campaign?.basics?.title || campaign.trackingId} has been published`,
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #000; background-color: #fff; margin: 0; padding: 0;">
                <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <img src="https://res.cloudinary.com/dbtuvgdcc/image/upload/v1752661700/banner_photos/Sbonssy_logo_all_black_cprwob.png" 
                         alt="Sbonssy Logo"
                         style="max-width: 200px; height: auto; display: block; margin: 0 auto 20px auto;" />
                    
                    <p style="color: #000; margin-bottom: 16px;">Hi ${brand.brand?.companyName || "there"},</p>
                    <p style="color: #000; margin-bottom: 24px;">Congratulations! Your campaign <strong>${campaign?.basics?.title || campaign.trackingId}</strong> has been published to the marketplace. Ambassadors can now discover and join your campaign.</p>
                    
                    <div style="text-align: center;">
                        <a href="${dashboardUrl}" 
                           style="display: inline-block; padding: 12px 24px; background-color: #f26915; 
                           color: white; text-decoration: none; border-radius: 50px; font-weight: bold;">
                           View Campaign
                        </a>
                    </div>
                    
                    <p style="color: #000; margin-top: 30px;">Best,<br>Team Sbonssy</p>
                </div>
            </div>
            `,
        });
      }
    } catch (emailErr) {
      console.warn(
        "Failed to send published email to brand:",
        emailErr?.message || emailErr,
      );
    }

    return NextResponse.json(
      {
        success: true,
        stateID: campaign.stateID,
        verification: campaign.verification,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in /api/admin/campaign/publish:", error);
    return NextResponse.json(
      { message: error.message || "Error publishing campaign" },
      { status: 500 },
    );
  }
}
