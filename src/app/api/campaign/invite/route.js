// pages/api/campaign/invite.js
import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import CampaignInteraction from "@/models/CampaignInteraction";
import User from "@/models/User";
import Campaign from "@/models/Campaign";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/sendEmail";

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
    let mongoUser;
    if (user.user_metadata.inviter_email) {
      mongoUser = await User.findOne({
        email: user.user_metadata.inviter_email,
      });
    } else {
      mongoUser = await User.findOne({ supabaseId: user.id });
    }
    if (!mongoUser || mongoUser.role !== "sports-ambassador") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const interactions = await CampaignInteraction.find({
      $or: [{ userId: mongoUser._id }, { userId: mongoUser.invitedBy }],
      interactionType: "private",
      status: "pending",
    })
      .populate({
        path: "campaignId",
        match: { stateID: { $ne: 2 } }, // This is filtering on the Campaign model
        select: "basics.title assets.logos stateId",
      })
      .populate("brandId", "brand.companyName")
      .select("campaignId brandId status createdAt");

    const formattedInteractions = interactions.map((i) => ({
      _id: i._id.toString(),
      campaignId: i.campaignId?._id.toString(),
      campaignTitle: i.campaignId?.basics?.title || "Untitled Campaign",
      brandName: i.brandId?.brand?.companyName || "Unknown Brand",
      logo: i.campaignId?.assets?.logos[0].url,
      status: i.status,
      createdAt: i.createdAt,
    }));

    return NextResponse.json(
      { data: { data: formattedInteractions } },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching invitations:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

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

    const mongoUser = await User.findOne({ supabaseId: user.id });
    if (!mongoUser || mongoUser.role !== "brand") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const { campaignId, ambassadorIds } = await req.json();

    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      return NextResponse.json(
        { message: "Invalid campaignId" },
        { status: 400 },
      );
    }

    if (
      !Array.isArray(ambassadorIds) ||
      ambassadorIds.length === 0 ||
      ambassadorIds.some((id) => !mongoose.Types.ObjectId.isValid(id))
    ) {
      return NextResponse.json(
        { message: "Invalid or empty ambassadorIds" },
        { status: 400 },
      );
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign || campaign.basics.campaignType !== "private") {
      return NextResponse.json(
        { message: "Invalid or non-private campaign" },
        { status: 400 },
      );
    }

    if (campaign?.verification?.status !== "accepted") {
      return NextResponse.json(
        {
          message:
            "Campaign must be accepted by Admin before inviting ambassadors",
        },
        { status: 400 },
      );
    }

    const ambassadors = await User.find({
      _id: { $in: ambassadorIds },
      role: "sports-ambassador",
      $or: [
        { athlete: { $exists: true, $ne: null } },
        { exAthlete: { $exists: true, $ne: null } },
        { paraAthlete: { $exists: true, $ne: null } },
        { coach: { $exists: true, $ne: null } },
        { team: { $exists: true, $ne: null } },
        { influencer: { $exists: true, $ne: null } },
      ],
    }).select("_id");

    if (ambassadors.length === 0) {
      return NextResponse.json(
        { message: "No valid ambassadors found" },
        { status: 404 },
      );
    }

    if (ambassadors.length !== ambassadorIds.length) {
      return NextResponse.json(
        { message: "Some ambassador IDs are invalid" },
        { status: 400 },
      );
    }

    const existingInteractions = await CampaignInteraction.find({
      campaignId,
      userId: { $in: ambassadorIds },
      interactionType: "private",
      status: { $in: ["pending", "accepted"] },
    });

    const existingAmbassadorIds = existingInteractions.map((i) =>
      i.userId.toString(),
    );

    const declinedInteractions = await CampaignInteraction.find({
      campaignId,
      userId: { $in: ambassadorIds },
      interactionType: "private",
      status: "declined",
    });

    const updatedDeclined = [];
    if (declinedInteractions.length > 0) {
      const declinedIds = declinedInteractions.map((i) => i._id);
      await CampaignInteraction.updateMany(
        { _id: { $in: declinedIds } },
        { $set: { status: "pending", updatedAt: new Date() } },
      );
      updatedDeclined.push(
        ...declinedInteractions.map((i) => i.userId.toString()),
      );
    }

    const newInteractions = ambassadors
      .filter(
        (amb) =>
          !existingAmbassadorIds.includes(amb._id.toString()) &&
          !updatedDeclined.includes(amb._id.toString()),
      )
      .map((ambassador) => ({
        campaignId,
        userId: ambassador._id,
        brandId: mongoUser._id,
        interactionType: "private",
        status: "pending",
      }));

    let totalInvitations = updatedDeclined.length;
    if (newInteractions.length > 0) {
      await CampaignInteraction.insertMany(newInteractions);
      totalInvitations += newInteractions.length;
    }

    // --- Send Email Notifications to Ambassadors ---
    try {
      const allRecipientIds = [...ambassadorIds]; // All who should have an email (new + re-sent)
      
      const recipients = await User.find({ _id: { $in: allRecipientIds } }).select("email athlete team influencer exAthlete paraAthlete coach");
  
      
      const emailPromises = recipients.map(async (recipient) => {
        if (!recipient.email) {
          console.warn(`[DEBUG] No email found for ambassador ${recipient._id}`);
          return;
        }

        const profile = recipient.athlete || recipient.team || recipient.influencer || recipient.exAthlete || recipient.paraAthlete || recipient.coach;
        const ambassadorName = profile?.name || "there";
        
        const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
        
        
        const result = await sendEmail({
          to: recipient.email,
          subject: `You have been invited to join the campaign "${campaign.basics.title}".`,
          text: `You have been invited to join the private campaign "${campaign.basics.title}" on Sbonssy. Login to your dashboard to view and accept the invitation.`,
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #000; background-color: #fff; margin: 0; padding: 0;">
              <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px;">
                <img src="https://res.cloudinary.com/dbtuvgdcc/image/upload/v1752661700/banner_photos/Sbonssy_logo_all_black_cprwob.png" alt="Sbonssy Logo" style="max-width: 200px; height: auto; margin-bottom: 20px;">
                
                <p style="color: #000; margin-bottom: 16px;">Hi ${ambassadorName},</p>
                <p style="color: #000; margin-bottom: 12px;">You have been invited to join the private campaign <strong>"${campaign.basics.title}"</strong> on Sbonssy.</p>
                <p style="color: #000; margin-bottom: 20px;">Login to your dashboard to view the details and accept the invitation.</p>
                
                <a href="${baseUrl}/sports-ambassador/campaigns" 
                   style="background-color: #F26915; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
                   Go to Dashboard
                </a>
                
                <p style="color: #000; margin-top: 30px;">Thank you,<br>Team Sbonssy</p>
              </div>
            </div>
          `,
        });
        
        return result;
      });

      await Promise.all(emailPromises);
    } catch (emailError) {
      console.error("[DEBUG] Error sending ambassador emails:", emailError);
      // We don't fail the whole request if email fails
    }
    // ------------------------------------------------

    if (totalInvitations === 0) {
      return NextResponse.json(
        { message: "All ambassadors have pending or accepted invitations" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        message: `Invitations sent or re-sent to ${totalInvitations} ambassadors`,
        success: true,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error sending invitations:", error);
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

    let mongoUser;
    if (user.user_metadata.inviter_email) {
      mongoUser = await User.findOne({
        email: user.user_metadata.inviter_email,
      });
    } else {
      mongoUser = await User.findOne({ supabaseId: user.id });
    }
    if (!mongoUser || mongoUser.role !== "sports-ambassador") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const { invitationId, action } = await req.json();

    if (!mongoose.Types.ObjectId.isValid(invitationId)) {
      return NextResponse.json(
        { message: "Invalid invitation ID" },
        { status: 400 },
      );
    }

    if (!["accept", "decline"].includes(action)) {
      return NextResponse.json({ message: "Invalid action" }, { status: 400 });
    }

    const interaction = await CampaignInteraction.findOne({
      _id: invitationId,
      userId: mongoUser._id,
      interactionType: "private",
      status: "pending",
    });

    if (!interaction) {
      return NextResponse.json(
        { message: "Invitation not found or already processed" },
        { status: 404 },
      );
    }

    interaction.status = action === "accept" ? "accepted" : "declined";
    await interaction.save();

    // --- Send Email Notification to Brand ---
    try {
      const campaign = await Campaign.findById(interaction.campaignId);
      const brand = await User.findById(interaction.brandId);
      const ambassador = await User.findById(interaction.userId);
      


      if (brand && brand.email && campaign) {
        let ambassadorName = "An ambassador";
        if (ambassador) {
          const profile = ambassador.athlete || ambassador.team || ambassador.influencer || ambassador.exAthlete || ambassador.paraAthlete || ambassador.coach;
          ambassadorName = profile?.name || ambassador.email || "An ambassador";
        }

        const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

     
        const result = await sendEmail({
          to: brand.email,
          subject: `Invitation ${action}ed: ${campaign.basics.title}`,
          text: `${ambassadorName} has ${action== "accept" ? "accepted" : "declined"} your invitation for the campaign "${campaign.basics.title}".`,
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #000; background-color: #fff; margin: 0; padding: 0;">
              <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px;">
                <img src="https://res.cloudinary.com/dbtuvgdcc/image/upload/v1752661700/banner_photos/Sbonssy_logo_all_black_cprwob.png" alt="Sbonssy Logo" style="max-width: 200px; height: auto; margin-bottom: 20px;">
                
                <p style="color: #000; margin-bottom: 16px;">Hi ${brand?.brand?.companyName || "there"},</p>
                <p style="color: #000; margin-bottom: 12px;"><strong>${ambassadorName}</strong> has <strong>${action}ed</strong> your invitation for the campaign <strong>"${campaign.basics.title}"</strong>.</p>
                <p style="color: #000; margin-bottom: 20px;">Login to your brand dashboard to see your campaign status.</p>
                
                <a href="${baseUrl}/brand/campaign" 
                   style="background-color: #F26915; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
                   Go to Dashboard
                </a>
                
                <p style="color: #000; margin-top: 30px;">Thank you,<br>Team Sbonssy</p>
              </div>
            </div>
          `,
        });
        
      } else {
        console.warn("[DEBUG] Could not send brand email. Missing details:", { brandEmail: brand?.email, campaign: !!campaign });
      }
    } catch (emailError) {
      console.error("[DEBUG] Error sending brand email:", emailError);
      // We don't fail the whole request if email fails
    }
    // -----------------------------------------

    return NextResponse.json(
      { data: { message: `Invitation ${action}ed successfully` } },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error processing invitation:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
