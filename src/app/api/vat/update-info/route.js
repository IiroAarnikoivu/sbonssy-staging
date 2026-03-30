import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { toCamelCase } from "@/lib/helper";
import { getAmbassadorVATRules, isEUCountry } from "@/lib/vat/viesValidator";

export async function POST(request) {
  try {
    const {
      userId,
      registrationCountry,
      businessType,
      vatNumber,
      vatStatus,
      businessRegistrationNumber,
    } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    await connectDB();

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Normalize inputs
    const normCountry = (registrationCountry || "").toString().toUpperCase();
    const normStatus = (vatStatus || "not_provided").toString().toLowerCase();
    // businessType no longer stored in schema; ignore mapping and storage

    // Determine VAT rules based on normalized country and status
    const vatRules = getAmbassadorVATRules(normCountry, normStatus);

    // Prepare normalized VAT details object
    const baseVatDetails = {
      registrationCountry: normCountry,
      vatNumber: vatNumber || null,
      vatCountry: vatNumber ? normCountry : null,
      vatStatus: normStatus,
      uiBusinessType: (businessType || "").toString(),
      needsVatOnCommission: vatRules.needsVatOnCommission,
      vatRate: vatRules.vatRate,
      lastVatCheckedAt: vatNumber ? new Date() : null,
      businessRegistrationNumber: isEUCountry(normCountry)
        ? null
        : (businessRegistrationNumber || "").trim() || null,
    };

    // Update VAT details for brand users (no subRole)
    if (user.role === "brand") {
      const brandCountry = user.brand?.country || null;
      const update = {
        "brand.vatDetails": { ...baseVatDetails },
        "brand.country": normCountry || brandCountry || null,
      };

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: update },
        {
          new: true,
          runValidators: true,
          select:
            "role brand.vatDetails brand.country brand.webhookApiKey brand.webhookSecret brand.webhookEnabled brand.webhookUrl brand.lastWebhookAt",
        },
      );

      return NextResponse.json({
        success: true,
        message: "VAT information updated successfully",
        vatRules: {
          needsVatOnCommission: vatRules.needsVatOnCommission,
          vatRate: vatRules.vatRate,
          treatment: vatRules.treatment,
          note: vatRules.note,
        },
        user: {
          id: updatedUser._id,
          role: updatedUser.role,
          vatInfo: updatedUser.brand?.vatDetails,
        },
      });
    }

    // Update the appropriate sub-role document for sports-ambassadors
    if (user.subRole) {
      const subRoleKey = toCamelCase(user.subRole || "");
      const updatePaths = {
        [`${subRoleKey}.vatDetails.registrationCountry`]:
          baseVatDetails.registrationCountry,
        [`${subRoleKey}.vatDetails.vatNumber`]: baseVatDetails.vatNumber,
        [`${subRoleKey}.vatDetails.vatCountry`]: baseVatDetails.vatCountry,
        [`${subRoleKey}.vatDetails.vatStatus`]: baseVatDetails.vatStatus,
        [`${subRoleKey}.vatDetails.uiBusinessType`]:
          baseVatDetails.uiBusinessType,
        [`${subRoleKey}.vatDetails.businessRegistrationNumber`]:
          baseVatDetails.businessRegistrationNumber,
        [`${subRoleKey}.vatDetails.needsVatOnCommission`]:
          baseVatDetails.needsVatOnCommission,
        [`${subRoleKey}.vatDetails.vatRate`]: baseVatDetails.vatRate,
        [`${subRoleKey}.vatDetails.lastVatCheckedAt`]:
          baseVatDetails.lastVatCheckedAt,
      };

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updatePaths },
        { new: true, runValidators: true },
      );

      return NextResponse.json({
        success: true,
        message: "VAT information updated successfully",
        vatRules: {
          needsVatOnCommission: vatRules.needsVatOnCommission,
          vatRate: vatRules.vatRate,
          treatment: vatRules.treatment,
          note: vatRules.note,
        },
        user: {
          id: updatedUser._id,
          subRole: updatedUser.subRole,
          vatInfo: updatedUser[subRoleKey]?.vatDetails,
        },
      });
    } else {
      return NextResponse.json(
        { error: "User sub-role not found" },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("VAT info update error:", error);
    return NextResponse.json(
      { error: "Failed to update VAT information", details: error.message },
      { status: 500 },
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    await connectDB();

    const user = await User.findById(userId)
      .select(
        "role subRole brand.vatDetails brand.country athlete.vatDetails influencer.vatDetails team.vatDetails paraAthlete.vatDetails exAthlete.vatDetails",
      )
      .lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // For brand users, return from brand.vatDetails with null defaults
    if (user.role === "brand") {
      const vatInfo = user.brand?.vatDetails || {};
      const norm = {
        registrationCountry:
          vatInfo.registrationCountry || user.brand?.country || null,
        vatNumber: vatInfo.vatNumber || null,
        vatCountry: vatInfo.vatCountry || null,
        vatStatus: vatInfo.vatStatus || "not_provided",
        uiBusinessType: vatInfo.uiBusinessType || null,
        businessRegistrationNumber: vatInfo.businessRegistrationNumber || null,
        needsVatOnCommission: !!vatInfo.needsVatOnCommission,
        vatRate: typeof vatInfo.vatRate === "number" ? vatInfo.vatRate : 0,
        lastVatCheckedAt: vatInfo.lastVatCheckedAt || null,
      };
      // If vatDetails is empty but brand.country exists, surface that
      if (!norm.registrationCountry && user.brand?.country) {
        norm.registrationCountry = user.brand.country;
      }
      return NextResponse.json({ success: true, vatInfo: norm });
    }

    if (!user.subRole) {
      return NextResponse.json(
        { error: "User sub-role not found" },
        { status: 400 },
      );
    }

    const subRole = toCamelCase(user.subRole || "");
    const vatInfo = user[subRole]?.vatDetails || {};
    const norm = {
      registrationCountry: vatInfo.registrationCountry || null,
      vatNumber: vatInfo.vatNumber || null,
      vatCountry: vatInfo.vatCountry || null,
      vatStatus: vatInfo.vatStatus || "not_provided",
      uiBusinessType: vatInfo.uiBusinessType || null,
      businessRegistrationNumber: vatInfo.businessRegistrationNumber || null,
      needsVatOnCommission: !!vatInfo.needsVatOnCommission,
      vatRate: typeof vatInfo.vatRate === "number" ? vatInfo.vatRate : 0,
      lastVatCheckedAt: vatInfo.lastVatCheckedAt || null,
    };

    return NextResponse.json({ success: true, vatInfo: norm });
  } catch (error) {
    console.error("VAT info retrieval error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve VAT information", details: error.message },
      { status: 500 },
    );
  }
}
