import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import { CollaborationRequest } from "@/models/CollaborationRequest";
import User from "@/models/User";

export async function GET(request) {
  try {
    await connectDB();
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return new Response(
        JSON.stringify({ message: "Unauthorized: Authentication failed" }),
        { status: 401 }
      );
    }
    let query;
    if (user.user_metadata.inviter_email) {
      const ambassadorId = await User.findOne({
        email: user.user_metadata.inviter_email,
      });
      query = { supabaseId: ambassadorId.supabaseId };
    } else {
      query = { supabaseId: user.id };
    }

    const currentUser = await User.findOne(query);
    if (!currentUser) {
      return new Response(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    }

    // Get all invites sent by the current user (brand)
    const invites = await CollaborationRequest.find({
      brandId: currentUser._id,
    }).populate("ambassadorId");

    // Transform data into object format keyed by ambassadorId
    const invitesData = {};
    invites.forEach((invite) => {
      const ambassadorId = invite.ambassadorId._id.toString();

      invitesData[ambassadorId] = {
        requestId: invite._id.toString(),
        ambassadorId: ambassadorId,
        ambassadorName:
          invite.ambassadorId.name || invite.ambassadorId.username,
        brandId: invite.brandId.toString(),
        status: invite.status,
        createdAt: invite.createdAt,
      };
    });

    return new Response(JSON.stringify(invitesData), { status: 200 });
  } catch (error) {
    console.error("Error fetching collaboration invites:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch collaboration invites" }),
      { status: 500 }
    );
  }
}
