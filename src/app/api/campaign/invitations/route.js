// import { connectDB } from "@/lib/db";
// import createClient from "@/lib/supabase/server";
// import InviteAmbassadors from "@/models/InviteAmbassadors";
// import User from "@/models/User";
// import mongoose from "mongoose";
// import { NextResponse } from "next/server";

// export async function GET(req) {
//   try {
//     await connectDB();

//     const supabase = await createClient();

//     // Authenticate user with Supabase
//     const {
//       data: { user },
//       error: authError,
//     } = await supabase.auth.getUser();

//     if (authError || !user?.id) {
//       return NextResponse.json(
//         { message: "Unauthorized: Authentication failed" },
//         { status: 401 }
//       );
//     }

//     // Find the MongoDB user by Supabase ID
//     const mongoUser = await User.findOne({ supabaseId: user.id });
//     if (!mongoUser) {
//       return NextResponse.json(
//         { message: "User not found in database" },
//         { status: 404 }
//       );
//     }

//     // Fetch invitations for the ambassador
//     const invitations = await InviteAmbassadors.find({
//       ambassadorId: mongoUser._id,
//       status: "pending", // Only pending invitations
//     })
//       .populate("campaignId", "basics.title")
//       .populate("brandId", "brand.companyName")
//       .select("campaignId brandId status createdAt");

//     const formattedInvitations = invitations.map((inv) => {
//       return {
//         _id: inv._id,
//         campaignTitle: inv.campaignId?.basics?.title || "Untitled Campaign",
//         brandName: inv.brandId?.brand?.companyName || "Unknown Brand",
//         status: inv.status,
//         createdAt: inv.createdAt,
//       };
//     });

//     return NextResponse.json(
//       { data: { data: formattedInvitations } },
//       { status: 200 }
//     );
//   } catch (error) {
//     console.error("Error fetching invitations:", error);
//     return NextResponse.json(
//       { message: error.message || "Error fetching invitations" },
//       { status: 500 }
//     );
//   }
// }

// export async function POST(req) {
//   try {
//     await connectDB();

//     const supabase = await createClient();

//     // Authenticate user with Supabase
//     const {
//       data: { user },
//       error: authError,
//     } = await supabase.auth.getUser();

//     if (authError || !user?.id) {
//       return NextResponse.json(
//         { message: "Unauthorized: Authentication failed" },
//         { status: 401 }
//       );
//     }

//     // Find the MongoDB user by Supabase ID
//     const mongoUser = await User.findOne({ supabaseId: user.id });
//     if (!mongoUser) {
//       return NextResponse.json(
//         { message: "User not found in database" },
//         { status: 404 }
//       );
//     }

//     const { invitationId, action } = await req.json();

//     // Validate input
//     if (!mongoose.Types.ObjectId.isValid(invitationId)) {
//       return NextResponse.json(
//         { message: "Invalid invitation ID" },
//         { status: 400 }
//       );
//     }

//     if (!["accept", "reject"].includes(action)) {
//       return NextResponse.json({ message: "Invalid action" }, { status: 400 });
//     }

//     // Find and update the invitation
//     const invitation = await InviteAmbassadors.findOne({
//       _id: invitationId,
//       ambassadorId: mongoUser._id,
//       status: "pending",
//     });

//     if (!invitation) {
//       return NextResponse.json(
//         { message: "Invitation not found or already processed" },
//         { status: 404 }
//       );
//     }

//     invitation.status = action === "accept" ? "accepted" : "declined";
//     await invitation.save();

//     return NextResponse.json(
//       { message: `Invitation ${action}ed successfully` },
//       { status: 200 }
//     );
//   } catch (error) {
//     console.error("Error processing invitation:", error);
//     return NextResponse.json(
//       { message: error.message || "Server error" },
//       { status: 500 }
//     );
//   }
// }
