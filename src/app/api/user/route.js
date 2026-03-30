import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import User from "@/models/User";
import { computeIsProfileCompleted } from "@/lib/helper";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/sendEmail";
import { createAdminClient } from "@/lib/supabase/admin";
import Invite from "@/models/Invite";
import { generateApiKey, generateWebhookSecret } from "@/lib/webhookUtils";
import { sendWelcomeEmail } from "@/lib/welcomeEmail";

export async function POST(request) {
  try {
    const { email, supabaseId, authProvider, role } = await request.json();
    const validRoles = ["admin", "fan", "sports-ambassador", "brand"];
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid or missing role" },
        { status: 400 },
      );
    }

    await connectDB();
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      const newUserData = {
        email,
        supabaseId,
        authProvider,
        role,
        isProfileCompleted: false,
      };
      const newUser = await User.create(newUserData);
      return NextResponse.json({ success: true, data: newUser });
    }

    const isProfileCompleted = computeIsProfileCompleted(existingUser);
    if (existingUser.isProfileCompleted !== isProfileCompleted) {
      await User.findOneAndUpdate(
        { email },
        { $set: { isProfileCompleted } },
        { new: true },
      );
    }

    return NextResponse.json({
      success: true,
      data: { ...existingUser.toObject(), isProfileCompleted },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const supabaseId = searchParams.get("supabaseId");
    if (!supabaseId) {
      return NextResponse.json(
        { error: "supabaseId is required" },
        { status: 400 },
      );
    }

    await connectDB();
    let user = await User.findOne({ supabaseId }).populate("invitedBy");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Use the stored isProfileCompleted value from database
    // Only recompute if explicitly needed for validation
    const storedIsProfileCompleted = user.isProfileCompleted;

    return NextResponse.json(
      {
        data: {
          ...user.toObject(),
          isProfileCompleted: storedIsProfileCompleted,
          message: "Profile Completed.",
        },
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const supabase = await createClient();

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      role,
      onBoarding,
      subRole,
      athlete,
      team,
      influencer,
      brand,
      fan,
      admin,
      paraAthlete,
      exAthlete,
      coach,
      currentPassword,
      newPassword,
      shopifyDetails,
      phoneNumber,
    } = await request.json();

    const validRoles = ["admin", "fan", "sports-ambassador", "brand"];
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid or missing role" },
        { status: 400 },
      );
    }

    if (role === "sports-ambassador") {
      const validSubRoles = [
        "athlete",
        "team",
        "influencer",
        "coach",
        "ex-athlete",
        "para-athlete",
      ];
      if (!subRole || !validSubRoles.includes(subRole)) {
        return NextResponse.json(
          { error: "Invalid or missing subRole" },
          { status: 400 },
        );
      }
    }

    // Handle password update if newPassword is provided
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Current password is required to update password" },
          { status: 400 },
        );
      }
      const { data, error: passwordError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (data) {
        await sendEmail({
          to: data.user.email,
          subject: "Your password has been updated",
          html: `
         <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #000; background-color: #fff; margin: 0; padding: 0;">
  <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px;">
    <img src="https://res.cloudinary.com/dbtuvgdcc/image/upload/v1752661700/banner_photos/Sbonssy_logo_all_black_cprwob.png" alt="Sbonssy Logo" style="max-width: 200px; height: auto;">
   
    <p style="color: #000; margin-bottom: 16px;">Hi ${
      data.user.email || "there"
    },</p>
    <p style="color: #000; margin-bottom: 16px;">This is a confirmation that your password has been successfully changed.</p>
    <p style="color: #000; margin-bottom: 24px;">If you didn't make this change, please contact us immediately</p>
    
    <a href="${
      process.env.NEXTAUTH_URL
    }" style="display: inline-block; padding: 12px 24px; background-color: #f26915; color: #fff; text-decoration: none; border-radius: 50px; font-weight: bold;">Stay connected</a>
    
    <p style="color: #000; margin-top: 30px;">Best,<br>Team Sbonssy</p>
  </div>
</div>
          `,
        });
      }
      if (passwordError) {
        return NextResponse.json(
          { error: passwordError.message || "Failed to update password" },
          { status: 400 },
        );
      }
    }

    await connectDB();
    const user = await User.findOne({ supabaseId: authUser.id }).select(
      "+brand.webhookApiKey +brand.webhookSecret +brand.webhookEnabled +brand.webhookUrl +brand.lastWebhookAt",
    );
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (subRole === "athlete" && athlete) {
      if (!athlete.gender)
        return NextResponse.json(
          { error: "Gender is required for athlete" },
          { status: 400 },
        );
      athlete.gender = athlete.gender.toLowerCase();
      if (athlete.images) {
        athlete.images = athlete.images.map((img, index) => ({
          url: img.url,
          isProfile: img.isProfile || index === 0,
          publicId: img.publicId || "",
        }));
      }
    } else if (subRole === "team" && team) {
      if (team.images) {
        team.images = team.images.map((img, index) => ({
          url: img.url,
          isProfile: img.isProfile || index === 0,
          publicId: img.publicId || "",
        }));
      }
    } else if (subRole === "influencer" && influencer) {
      if (!influencer.gender)
        return NextResponse.json(
          { error: "Gender is required for influencer" },
          { status: 400 },
        );
      influencer.gender = influencer.gender.toLowerCase();
      if (influencer.images) {
        influencer.images = influencer.images.map((img, index) => ({
          url: img.url,
          isProfile: img.isProfile || index === 0,
          publicId: img.publicId || "",
        }));
      }
    } else if (subRole === "coach" && coach) {
      if (!coach.gender)
        return NextResponse.json(
          { error: "Gender is required for coach" },
          { status: 400 },
        );
      coach.gender = coach.gender.toLowerCase();
      if (coach.images) {
        coach.images = coach.images.map((img, index) => ({
          url: img.url,
          isProfile: img.isProfile || index === 0,
          publicId: img.publicId || "",
        }));
      }
    } else if (subRole === "ex-athlete" && exAthlete) {
      if (!exAthlete.gender)
        return NextResponse.json(
          { error: "Gender is required for ex-athlete" },
          { status: 400 },
        );
      exAthlete.gender = exAthlete.gender.toLowerCase();
      if (exAthlete.images) {
        exAthlete.images = exAthlete.images.map((img, index) => ({
          url: img.url,
          isProfile: img.isProfile || index === 0,
          publicId: img.publicId || "",
        }));
      }
    } else if (subRole === "para-athlete" && paraAthlete) {
      if (!paraAthlete.gender)
        return NextResponse.json(
          { error: "Gender is required for para-athlete" },
          { status: 400 },
        );
      paraAthlete.gender = paraAthlete.gender.toLowerCase();
      if (paraAthlete.images) {
        paraAthlete.images = paraAthlete.images.map((img, index) => ({
          url: img.url,
          isProfile: img.isProfile || index === 0,
          publicId: img.publicId || "",
        }));
      }
    }

    const updateData = { role, subRole };
    // Persist phone number at root (shared for all roles)
    if (typeof phoneNumber === "string") {
      const sanitized = phoneNumber.replace(/\D/g, "").slice(0, 15);
      // Allow empty string to clear phone, or save sanitized digits
      updateData.phoneNumber = sanitized;
    }
    if (role === "sports-ambassador") {
      // Helper function to ensure new fields are included and merge with existing data
      const mergeSubRoleData = (incoming, existingKey) => {
        const existing =
          (user[existingKey]?.toObject
            ? user[existingKey].toObject()
            : user[existingKey]) || {};
        return {
          ...existing,
          ...incoming,
          businessType:
            incoming.businessType || existing.businessType || "individual",
          onboardingStatus:
            incoming.onboardingStatus || existing.onboardingStatus || "pending",
        };
      };

      if (subRole === "athlete")
        updateData.athlete = mergeSubRoleData(athlete, "athlete");
      else if (subRole === "team")
        updateData.team = mergeSubRoleData(team, "team");
      else if (subRole === "influencer")
        updateData.influencer = mergeSubRoleData(influencer, "influencer");
      else if (subRole === "coach")
        updateData.coach = mergeSubRoleData(coach, "coach");
      else if (subRole === "para-athlete")
        updateData.paraAthlete = mergeSubRoleData(paraAthlete, "paraAthlete");
      else if (subRole === "ex-athlete")
        updateData.exAthlete = mergeSubRoleData(exAthlete, "exAthlete");
    } else if (role === "brand") {
      const safeWebhookSnapshot = (label, brandData) => {
        try {
        } catch (_) {}
      };

      // Merge existing brand data to avoid overwriting webhook credentials on partial updates
      const existingBrand =
        (user.brand?.toObject ? user.brand.toObject() : user.brand) || {};
      const cleanedBrand =
        brand && typeof brand === "object"
          ? Object.fromEntries(
              Object.entries(brand).filter(([, v]) => v !== undefined),
            )
          : {};

      // Normalize new name fields
      const normalizedBrand = { ...existingBrand, ...cleanedBrand };
      if (typeof normalizedBrand.firstName === "string") {
        normalizedBrand.firstName = normalizedBrand.firstName.trim();
      }
      if (typeof normalizedBrand.lastName === "string") {
        normalizedBrand.lastName = normalizedBrand.lastName.trim();
      }

      // Only include shopifyDetails when a valid decoded payload is provided.
      // Support both shapes: { decoded: {...} } or a flat object.
      const decoded = shopifyDetails?.decoded || shopifyDetails;
      const hasValidShopify =
        decoded && (decoded.myShopifyDomain || decoded.shopifyId);

      safeWebhookSnapshot("normalized_pre_shopify", normalizedBrand);

      // If requester is an invited brand user and provides Shopify details,
      // update the inviter's Shopify connection instead of the invited user's document.
      if (hasValidShopify && user?.invitedBy) {
        try {
          await User.findByIdAndUpdate(
            user.invitedBy,
            {
              $set: {
                "brand.shopifyDetails": {
                  myShopifyDomain: decoded?.myShopifyDomain,
                  shopifyId: decoded?.shopifyId,
                },
              },
            },
            { new: true },
          );
        } catch (_) {}
      }

      // Always update own normalized brand fields; include shopifyDetails only when the brand owner connects.
      updateData.brand = {
        ...normalizedBrand,
        ...(!user?.invitedBy &&
          hasValidShopify && {
            shopifyDetails: {
              myShopifyDomain: decoded?.myShopifyDomain,
              shopifyId: decoded?.shopifyId,
            },
          }),
      };
      safeWebhookSnapshot("update_payload", updateData.brand);
      // if (shopify_token) {
      //   updateData.shopify_token = ""; // Store shopify_token
      // }
    } else if (role === "fan") {
      updateData.fan = fan;
    } else if (role === "admin") {
      updateData.admin = admin;
    } else {
      updateData.shopify_token = "";
    }

    const updatedUserData = { ...user.toObject(), ...updateData };

    if (newPassword) {
      // When updating password, preserve existing isProfileCompleted status
      updateData.isProfileCompleted = user.isProfileCompleted;
    } else {
      // Only update isProfileCompleted if it actually changes
      const computedIsProfileCompleted =
        computeIsProfileCompleted(updatedUserData);

      // Preserve existing true status unless computed value is also true
      // This prevents profile completion status from being downgraded
      if (user.isProfileCompleted && !computedIsProfileCompleted) {
        updateData.isProfileCompleted = user.isProfileCompleted;
      } else {
        updateData.isProfileCompleted = computedIsProfileCompleted;
      }

      if (updateData.isProfileCompleted) {
        updateData.stateId = 1;
      }
    }

    if (updateData.isProfileCompleted) {
      updateData.stateId = 1;

      // 🔐 Auto-generate webhook credentials for brands on first profile completion
      if (role === "brand" && !user.brand?.webhookApiKey) {
        const apiKey = generateApiKey();
        const secret = generateWebhookSecret();

        updateData.brand = {
          ...updateData.brand,
          webhookApiKey: apiKey,
          webhookSecret: secret,
          webhookEnabled: true,
        };
      }
    }
    // Always update the authenticated user's document.
    // Do not redirect updates to the inviter's user based on inviter_email metadata.
    const query = { supabaseId: authUser.id };

    const updatedUser = await User.findOneAndUpdate(
      query,
      {
        ...(Object.keys(updateData).length && { $set: updateData }),
        // ...(Object.keys(unsetData).length && { $unset: unsetData }),
      },
      { new: true, runValidators: true },
    );

    // --- Send Welcome Email on First Profile Completion ---
    if (updatedUser?.isProfileCompleted && !user.isProfileCompleted) {
      try {
        const emailResult = await sendWelcomeEmail(authUser, updatedUser.role);
        if (emailResult.success) {
        }
      } catch (emailErr) {
        console.error(
          "[ERROR] Failed to send welcome email on profile completion:",
          emailErr,
        );
      }
    }
    // ------------------------------------------------------
    const { data: supabaseData, error: supabaseError } =
      await supabase.auth.updateUser({
        data: { isProfileCompleted: true },
      });

    if (supabaseError) {
      return NextResponse.json(
        { error: supabaseError.message || "Failed to update user metadata" },
        { status: 400 },
      );
    }

    const res = NextResponse.json(
      {
        success: true,
        data: updatedUser,
        message: "Profile Updated Successfully.",
      },
      { status: 200 },
    );

    // Sync isProfileCompleted cookie to avoid stale middleware redirects
    if (updatedUser?.isProfileCompleted) {
      res.cookies.set("isProfileCompleted", "true", {
        path: "/",
        httpOnly: false, // Let client access it if needed
        sameSite: "lax",
        maxAge: 3600, // 1 hour is plenty for the redirect bridge
      });
      res.cookies.set("role", updatedUser.role, {
        path: "/",
        httpOnly: false,
        sameSite: "lax",
        maxAge: 3600,
      });
    }

    return res;
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    // Initialize Supabase client
    const supabase = await createClient();
    const supabaseAdmin = await createAdminClient();

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { message: "Unauthorized or user not found" },
        { status: 401 },
      );
    }

    // Connect to MongoDB
    await connectDB();

    // Find the user in MongoDB
    const userId = user.id;
    const userData = await User.findOne({ supabaseId: userId });

    const inviteData = await Invite.findOne({ supabaseId: userId });

    if (!userData) {
      return NextResponse.json(
        { message: "User not found in database" },
        { status: 404 },
      );
    }

    // Delete user from MongoDB
    await User.findByIdAndDelete(userData._id);
    if (inviteData && inviteData._id) {
      await Invite.findByIdAndDelete(inviteData._id);
    }

    // Delete user from Supabase using admin API
    const { data, error: deleteError } =
      await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      // Handle partial deletion (user deleted from MongoDB but not Supabase)
      return NextResponse.json(
        {
          message:
            "User deleted from database but failed to delete from Supabase",
          error: deleteError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { message: "User deleted successfully from both database and Supabase" },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error in deleting user", error: error.message },
      { status: 500 },
    );
  }
}
