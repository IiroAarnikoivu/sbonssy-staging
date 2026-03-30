import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import User from "@/models/User";
import WebhookEvent from "@/models/WebhookEvent";

/**
 * GET /api/brand/webhook-events
 * Fetch recent webhook events for the authenticated brand
 */
export async function GET(req) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Find brand user
    let brandUser = await User.findOne({
      supabaseId: user.id,
      role: "brand",
    });

    if (!brandUser) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    // If invited by another brand, fetch that brand's events
    const effectiveBrandId = brandUser.invitedBy || brandUser._id;

    // Get limit from query params
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "10");

    // Fetch recent webhook events
    const events = await WebhookEvent.find({ brandId: effectiveBrandId })
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 50))
      .select("eventType status createdAt processingDurationMs errorMessage");

    return NextResponse.json({
      success: true,
      events,
    });
  } catch (error) {
    console.error("Error fetching webhook events:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
