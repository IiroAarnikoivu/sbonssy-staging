import { NextResponse } from "next/server";
import { validateVATNumber } from "@/lib/vat/viesValidator";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function POST(request) {
  try {
    const { vatNumber, countryCode, userId } = await request.json();

    if (!vatNumber || !countryCode) {
      return NextResponse.json(
        { error: "VAT number and country code are required" },
        { status: 400 }
      );
    }

    // Validate VAT number using VIES
    const validationResult = await validateVATNumber(vatNumber);

    // If user ID is provided, update their VAT information
    if (userId && validationResult.isValid) {
      await connectDB();
      
      const updateData = {
        vatNumber: validationResult.vatNumber,
        vatCountry: validationResult.country,
        vatStatus: validationResult.isValid ? 'valid' : 'invalid',
        lastVatCheckedAt: new Date()
      };

      // Update the appropriate sub-role document
      const user = await User.findById(userId);
      if (user && user.subRole) {
        const subRole = user.subRole.toLowerCase();
        const updatePath = `${subRole}.vatNumber`;
        const updateCountryPath = `${subRole}.vatCountry`;
        const updateStatusPath = `${subRole}.vatStatus`;
        const updateCheckedPath = `${subRole}.lastVatCheckedAt`;

        await User.findByIdAndUpdate(userId, {
          [updatePath]: validationResult.vatNumber,
          [updateCountryPath]: validationResult.country,
          [updateStatusPath]: validationResult.isValid ? 'valid' : 'invalid',
          [updateCheckedPath]: new Date()
        });
      }
    }

    return NextResponse.json({
      success: true,
      validation: validationResult
    });

  } catch (error) {
    console.error("VAT validation error:", error);
    return NextResponse.json(
      { error: "VAT validation failed", details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const vatNumber = searchParams.get('vatNumber');
    const countryCode = searchParams.get('countryCode');

    if (!vatNumber || !countryCode) {
      return NextResponse.json(
        { error: "VAT number and country code are required" },
        { status: 400 }
      );
    }

    const validationResult = await validateVATNumber(vatNumber);

    return NextResponse.json({
      success: true,
      validation: validationResult
    });

  } catch (error) {
    console.error("VAT validation error:", error);
    return NextResponse.json(
      { error: "VAT validation failed", details: error.message },
      { status: 500 }
    );
  }
}
