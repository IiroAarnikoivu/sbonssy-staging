import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import User from "@/models/User";
import {
  generateApiKey,
  generateWebhookSecret,
  maskApiKey,
} from "@/lib/webhookUtils";

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:5200";

/**
 * GET /api/brand/webhook-settings
 * Retrieve webhook configuration for the authenticated brand
 */
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

    let brand = await User.findOne({ supabaseId: user.id }).select(
      "+brand.webhookApiKey +brand.webhookSecret",
    );
    
    if (!brand) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 },
      );
    }

    // If invited by another brand, fetch that brand's settings
    if (brand.role === "brand" && brand.invitedBy) {
      brand = await User.findById(brand.invitedBy).select(
        "+brand.webhookApiKey +brand.webhookSecret",
      );
    }

    if (!brand || brand.role !== "brand") {
      return NextResponse.json(
        { message: "Only brands can access webhook settings" },
        { status: 403 },
      );
    }

    const webhookUrl = `${BASE_URL}/api/webhooks/conversion`;
    const testWebhookUrl = `${BASE_URL}/api/webhooks/test`;

    return NextResponse.json(
      {
        webhookUrl,
        testWebhookUrl,
        apiKey: brand.brand?.webhookApiKey || null,
        hasApiKey: !!brand.brand?.webhookApiKey,
        webhookSecret: brand.brand?.webhookSecret || null,
        webhookEnabled: brand.brand?.webhookEnabled || false,
        isWebhookConfigured: brand.brand?.isWebhookConfigured || false,
        webhookSecretExists: !!brand.brand?.webhookSecret,
        lastWebhookAt: brand.brand?.lastWebhookAt || null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching webhook settings:", error);
    return NextResponse.json(
      { message: error.message || "Failed to fetch webhook settings" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/brand/webhook-settings
 * Generate new API key and secret
 */
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

    const brand = await User.findOne({ supabaseId: user.id });

    if (!brand || brand.role !== "brand") {
      return NextResponse.json(
        { message: "User not found or not a brand" },
        { status: 404 },
      );
    }

    if (brand.invitedBy) {
      return NextResponse.json(
        { message: "Only brand owners can manage webhook settings" },
        { status: 403 },
      );
    }

    const apiKey = generateApiKey();
    const webhookSecret = generateWebhookSecret();

    await User.updateOne(
      { _id: brand._id },
      {
        "brand.webhookApiKey": apiKey,
        "brand.webhookSecret": webhookSecret,
        "brand.webhookEnabled": true,
      },
    );

    return NextResponse.json(
      {
        message: "API key generated successfully",
        apiKey, // Return full key only once
        webhookSecret, // Return secret only once
        webhookUrl: `${BASE_URL}/api/webhooks/conversion`,
        testWebhookUrl: `${BASE_URL}/api/webhooks/test`,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error generating API key:", error);
    return NextResponse.json(
      { message: error.message || "Failed to generate API key" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/brand/webhook-settings
 * Update webhook settings (enable/disable)
 */
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

    const brand = await User.findOne({ supabaseId: user.id });

    if (!brand || brand.role !== "brand") {
      return NextResponse.json(
        { message: "User not found or not a brand" },
        { status: 404 },
      );
    }

    if (brand.invitedBy) {
      return NextResponse.json(
        { message: "Only brand owners can manage webhook settings" },
        { status: 403 },
      );
    }

    const { webhookEnabled } = await req.json();

    if (typeof webhookEnabled !== "boolean") {
      return NextResponse.json(
        { message: "webhookEnabled must be a boolean" },
        { status: 400 },
      );
    }

    await User.updateOne(
      { _id: brand._id },
      { "brand.webhookEnabled": webhookEnabled },
    );

    return NextResponse.json(
      {
        message: `Webhook ${webhookEnabled ? "enabled" : "disabled"} successfully`,
        webhookEnabled,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating webhook settings:", error);
    return NextResponse.json(
      { message: error.message || "Failed to update webhook settings" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/brand/webhook-settings
 * Revoke API key and secret
 */
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

    const brand = await User.findOne({ supabaseId: user.id });

    if (!brand || brand.role !== "brand") {
      return NextResponse.json(
        { message: "User not found or not a brand" },
        { status: 404 },
      );
    }

    if (brand.invitedBy) {
      return NextResponse.json(
        { message: "Only brand owners can manage webhook settings" },
        { status: 403 },
      );
    }

    await User.updateOne(
      { _id: brand._id },
      {
        "brand.webhookApiKey": null,
        "brand.webhookSecret": null,
        "brand.webhookEnabled": false,
      },
    );

    return NextResponse.json(
      { message: "API key revoked successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error revoking API key:", error);
    return NextResponse.json(
      { message: error.message || "Failed to revoke API key" },
      { status: 500 },
    );
  }
}
