import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import CampaignInteraction from "@/models/CampaignInteraction";
import User from "@/models/User";
import Campaign from "@/models/Campaign";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/sendEmail";
import stripe from "@/lib/stripe";
import { toCamelCase } from "@/lib/helper";

// GET: Fetch ambassador's campaign interactions
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

    const mongoUser = await User.findOne({ supabaseId: user.id });
    if (!mongoUser || mongoUser.role !== "sports-ambassador") {
      return NextResponse.json(
        { message: "Unauthorized: Must be an ambassador" },
        { status: 403 }
      );
    }

    const interactions = await CampaignInteraction.find({
      userId: mongoUser._id,
      interactionType: "apply",
    })
      .populate("campaignId", "basics.title")
      .populate("brandId")
      .select("campaignId brandId status");

    const formattedInteractions = interactions.map((i) => {
      return {
        _id: i._id.toString(),
        campaignId: i.campaignId?._id.toString(),
        campaignTitle: i.campaignId?.basics?.title || "Unknown Campaign",
        brandId: i.brandId._id?.toString(),
        brandName: i.brandId.brand.companyName || "Unknown brand",
        status: i.status,
      };
    });

    return NextResponse.json(
      { requests: formattedInteractions },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching campaign interactions:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// POST: Create a new campaign interaction (moved to /brand/requests)
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

    // const mongoUser = await User.findOne({ supabaseId: user.id });
    // if (!mongoUser || mongoUser.role !== "sports-ambassador") {
    //   return NextResponse.json(
    //     { message: "Unauthorized: Must be an ambassador" },
    //     { status: 403 }
    //   );
    // }

    const {
      campaignId,
      brandId: providedBrandId,
      userId,
      termsAccepted,
    } = await req.json();

    if (
      !mongoose.Types.ObjectId.isValid(campaignId) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return NextResponse.json(
        { message: "Invalid campaignId or userId" },
        { status: 400 }
      );
    }

    const campaign = await Campaign.findById(campaignId).select(
      "brandId basics.campaignType"
    );
    if (!campaign) {
      return NextResponse.json(
        { message: "Campaign not found" },
        { status: 404 }
      );
    }
    if (campaign.basics.campaignType !== "apply") {
      return NextResponse.json(
        { message: "Campaign is not of type 'apply'" },
        { status: 400 }
      );
    }

    // Enforce Stripe connected & verified for the applicant
    const applicant = await User.findById(userId);
    if (!applicant || applicant.role !== "sports-ambassador") {
      return NextResponse.json(
        { message: "Unauthorized: Must be an ambassador" },
        { status: 403 }
      );
    }
    const subRole = toCamelCase(applicant.subRole || "");
    const stripeAccountId = applicant?.[subRole]?.stripeAccountId;
    if (!stripeAccountId) {
      return NextResponse.json(
        { message: "Stripe account not connected. Please connect your account to apply." },
        { status: 400 }
      );
    }
    const account = await stripe.accounts.retrieve(stripeAccountId);
    const currentlyDue = account?.requirements?.currently_due || [];
    const disabledReason = account?.requirements?.disabled_reason || null;
    const enabledForPayoutsOrCharges = !!(account?.payouts_enabled || account?.charges_enabled);
    const isVerified = enabledForPayoutsOrCharges && currentlyDue.length === 0 && !disabledReason;
    if (!isVerified) {
      return NextResponse.json(
        { message: "Stripe account not verified. Please complete verification to apply." },
        { status: 403 }
      );
    }

    const brandId =
      providedBrandId && mongoose.Types.ObjectId.isValid(providedBrandId)
        ? providedBrandId
        : campaign.brandId;

    if (!mongoose.Types.ObjectId.isValid(brandId)) {
      return NextResponse.json(
        { message: "Invalid or missing brandId" },
        { status: 400 }
      );
    }

    const existingInteraction = await CampaignInteraction.findOne({
      campaignId,
      userId,
      interactionType: "apply",
    });
    if (existingInteraction) {
      return NextResponse.json(
        { message: "Request already exists" },
        { status: 400 }
      );
    }

    const interaction = new CampaignInteraction({
      campaignId,
      userId,
      brandId,
      interactionType: "apply",
      status: "pending",
      termsAccepted,
    });

    await interaction.save();

    // --- Send Email Notification to Brand ---
    try {
      const brand = await User.findById(brandId);
      const ambassador = applicant; // Already fetched as 'applicant'
      const campaignDetails = campaign; // Already fetched as 'campaign'

      if (brand && brand.email) {
        let ambassadorName = "An ambassador";
        if (ambassador) {
          const profile = ambassador.athlete || ambassador.team || ambassador.influencer || ambassador.exAthlete || ambassador.paraAthlete || ambassador.coach;
          ambassadorName = profile?.name || ambassador.email || "An ambassador";
        }

        const brandFirstName = brand.brand?.firstName || brand.brand?.name || "there";
        const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

        await sendEmail({
          to: brand.email,
          subject: "New ambassador wants to collaborate",
          text: `Hi ${brandFirstName}, Great news! ${ambassadorName} is interested in collaborating on your campaign. Don’t miss the chance to connect and create something impactful. Log in to respond: ${baseUrl}/brand/campaign`,
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #000; background-color: #fff; margin: 0; padding: 0;">
              <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px;">
                <img src="https://res.cloudinary.com/dbtuvgdcc/image/upload/v1752661700/banner_photos/Sbonssy_logo_all_black_cprwob.png" alt="Sbonssy Logo" style="max-width: 200px; height: auto; margin-bottom: 20px;">
                
                <p style="color: #000; margin-bottom: 16px;">Hi ${brandFirstName},</p>
                <p style="color: #000; margin-bottom: 12px;">Great news! <strong>${ambassadorName}</strong> is interested in collaborating on your campaign.</p>
                <p style="color: #000; margin-bottom: 20px;">Don’t miss the chance to connect and create something impactful.</p>
                
                <p style="color: #000; margin-bottom: 20px;">Log in to respond:</p>
                <a href="${baseUrl}/brand/campaign" 
                   style="background-color: #F26915; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
                   See Ambassador
                </a>
                
                <p style="color: #000; margin-top: 30px;">Best,<br>Team Sbonssy</p>
              </div>
            </div>
          `,
        });
      }
    } catch (emailError) {
      console.error("Error sending collaboration request email:", emailError);
      // We don't fail the whole request if email fails
    }
    // -----------------------------------------

    return NextResponse.json(
      { status: "pending", requestId: interaction._id },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error creating campaign interaction:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// PUT: Accept or decline a campaign interaction
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

    const mongoUser = await User.findOne({ supabaseId: user.id });
    // if (!mongoUser || mongoUser.role !== "brand") {
    // return NextResponse.json(
    //   { message: "Unauthorized: Must be a brand" },
    //   { status: 403 }
    // );
    // }

    // Parse JSON body
    const { requestId, action } = await req.json();

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return NextResponse.json(
        { message: "Invalid requestId" },
        { status: 400 }
      );
    }

    if (!["accept", "decline"].includes(action)) {
      return NextResponse.json({ message: "Invalid action" }, { status: 400 });
    }

    const interaction = await CampaignInteraction.findOne({
      _id: requestId,
      $or: [{ brandId: mongoUser._id }, { brandId: mongoUser.invitedBy }],
      interactionType: "apply",
      status: "pending",
    });

    if (!interaction) {
      return NextResponse.json(
        { message: "Request not found or already processed." },
        { status: 404 }
      );
    }

    interaction.status = action === "accept" ? "accepted" : "rejected";
    await interaction.save();

    // --- Send Email Notification to Ambassador ---
    try {
      const ambassador = await User.findById(interaction.userId);
      const campaign = await Campaign.findById(interaction.campaignId);
      const brand = await User.findById(interaction.brandId);

      if (ambassador && ambassador.email && campaign) {
        const profile = ambassador.athlete || ambassador.team || ambassador.influencer || ambassador.exAthlete || ambassador.paraAthlete || ambassador.coach;
        const ambassadorName = profile?.name || "there";
        const brandName = brand?.brand?.companyName || "the brand";
        
        const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

        let subject, contentHeader, contentBody, buttonLabel;

        if (action === "accept") {
          subject = `Collaboration request accepted: ${campaign.basics.title}`;
          contentHeader = "Great news!";
          contentBody = `Your collaboration request for the campaign <strong>"${campaign.basics.title}"</strong> has been accepted by <strong>${brandName}</strong>.`;
          buttonLabel = "Go to Dashboard";
        } else {
          subject = `Collaboration request update: ${campaign.basics.title}`;
          contentHeader = "Collaboration Update";
          contentBody = `Thank you for your interest in collaborating on the campaign <strong>"${campaign.basics.title}"</strong>. Unfortunately, the brand has decided not to proceed with your request at this time. Keep an eye out for other exciting campaigns on Sbonssy!`;
          buttonLabel = "Go to Dashboard";
        }

        await sendEmail({
          to: ambassador.email,
          subject: subject,
          text: `Hi ${ambassadorName}, ${contentHeader} ${contentBody.replace(/<[^>]*>/g, '')} Log in to your dashboard to see more.`,
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #000; background-color: #fff; margin: 0; padding: 0;">
              <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px;">
                <img src="https://res.cloudinary.com/dbtuvgdcc/image/upload/v1752661700/banner_photos/Sbonssy_logo_all_black_cprwob.png" alt="Sbonssy Logo" style="max-width: 200px; height: auto; margin-bottom: 20px;">
                
                <p style="color: #000; margin-bottom: 16px;">Hi ${ambassadorName},</p>
                <p style="color: #000; margin-bottom: 12px;">${contentHeader}</p>
                <p style="color: #000; margin-bottom: 20px;">${contentBody}</p>
                
                <a href="${baseUrl}/sports-ambassador/campaigns" 
                   style="background-color: #F26915; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
                   ${buttonLabel}
                </a>
                
                <p style="color: #000; margin-top: 30px;">Best,<br>Team Sbonssy</p>
              </div>
            </div>
          `,
        });
      }
    } catch (emailError) {
      console.error("Error sending collaboration response email:", emailError);
      // We don't fail the whole request if email fails
    }
    // ---------------------------------------------

    return NextResponse.json(
      { success: true, status: interaction.status },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating campaign interaction:", error);
    return NextResponse.json(
      { message: "Server error", error: error },
      { status: 500 }
    );
  }
}

// DELETE: Cancel a pending campaign interaction
// src/app/api/campaign-request/route.js

export async function DELETE(req) {
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

    const mongoUser = await User.findOne({ supabaseId: user.id });
    if (
      !mongoUser ||
      !["sports-ambassador", "brand"].includes(mongoUser.role)
    ) {
      return NextResponse.json(
        { message: "Unauthorized: Must be an ambassador or brand" },
        { status: 403 }
      );
    }

    const { requestId } = await req.json();

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return NextResponse.json(
        { message: "Invalid requestId" },
        { status: 400 }
      );
    }

    const interaction = await CampaignInteraction.findOne({
      _id: requestId,
      interactionType: "apply",
      status: "pending",
      ...(mongoUser.role === "brand"
        ? {
            $or: [{ brandId: mongoUser._id }, { brandId: mongoUser.invitedBy }],
          }
        : { userId: mongoUser._id }),
    });

    if (!interaction) {
      return NextResponse.json(
        { message: "Request not found or already processed" },
        { status: 404 }
      );
    }

    await CampaignInteraction.deleteOne({ _id: requestId });

    return NextResponse.json(
      { success: true, message: "Request cancelled successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting campaign interaction:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
