import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import CampaignInteraction from "@/models/CampaignInteraction";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function DELETE(req, { params }) {
  try {
    await connectDB();

    // Authenticate the user

    const { requestId } = await params;

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

    if (!requestId) {
      return NextResponse.json(
        { message: "Request ID and Campaign ID are required" },
        { status: 400 }
      );
    }

    // Verify the user is the campaign owner (brand) and find the interaction
    const interaction = await CampaignInteraction.findByIdAndDelete(requestId, {
      brandId: mongoUser?._id, // Ensure the authenticated user is the brand
    });

    if (!interaction) {
      return NextResponse.json(
        {
          message:
            "Interaction not found or you are not authorized to remove this ambassador",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        data: {
          success: true,
          message: "Ambassador removed successfully",
          deletedInteraction: interaction, // Optionally return the deleted interaction
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error removing ambassador:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Error removing ambassador",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
