// import { connectDB } from "@/lib/db";
// import createClient from "@/lib/supabase/server";
// import InviteAmbassadors from "@/models/InviteAmbassadors";
// import User from "@/models/User";
// import mongoose from "mongoose";
// import { NextResponse } from "next/server";

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

//     const { campaignId, brandId, ambassadorIds } = await req.json();

//     // Validate input
//     if (
//       !mongoose.Types.ObjectId.isValid(campaignId) ||
//       !mongoose.Types.ObjectId.isValid(brandId)
//     ) {
//       return NextResponse.json(
//         { message: "Invalid campaignId or brandId" },
//         { status: 400 }
//       );
//     }

//     if (
//       !Array.isArray(ambassadorIds) ||
//       ambassadorIds.length === 0 ||
//       ambassadorIds.some((id) => !mongoose.Types.ObjectId.isValid(id))
//     ) {
//       return NextResponse.json(
//         { message: "Invalid or empty ambassadorIds array" },
//         { status: 400 }
//       );
//     }

//     // Verify ambassadors exist and have valid sub-documents
//     const ambassadors = await User.find({
//       _id: { $in: ambassadorIds },
//       $or: [
//         { athlete: { $exists: true, $ne: null } },
//         { exAthlete: { $exists: true, $ne: null } },
//         { paraAthlete: { $exists: true, $ne: null } },
//         { coach: { $exists: true, $ne: null } },
//         { team: { $exists: true, $ne: null } },
//         { influencer: { $exists: true, $ne: null } },
//       ],
//     }).select("_id email");

//     if (ambassadors.length === 0) {
//       return NextResponse.json(
//         { message: "No valid ambassadors found for the provided IDs" },
//         { status: 404 }
//       );
//     }

//     if (ambassadors.length !== ambassadorIds.length) {
//       return NextResponse.json(
//         { message: "Some ambassador IDs are invalid or not eligible" },
//         { status: 400 }
//       );
//     }

//     // Check for existing invitations (pending or accepted only)
//     const existingInvitations = await InviteAmbassadors.find({
//       campaignId,
//       ambassadorId: { $in: ambassadorIds },
//       status: { $in: ["pending", "accepted"] }, // Exclude declined
//     });

//     const existingAmbassadorIds = existingInvitations.map((inv) =>
//       inv.ambassadorId.toString()
//     );

//     // Find declined invitations to update
//     const declinedInvitations = await InviteAmbassadors.find({
//       campaignId,
//       ambassadorId: { $in: ambassadorIds },
//       status: "declined",
//     });

//     // Update declined invitations to pending
//     const updatedDeclined = [];
//     if (declinedInvitations.length > 0) {
//       const declinedIds = declinedInvitations.map((inv) => inv._id);
//       await InviteAmbassadors.updateMany(
//         { _id: { $in: declinedIds } },
//         { $set: { status: "pending", updatedAt: new Date() } }
//       );
//       updatedDeclined.push(
//         ...declinedInvitations.map((inv) => inv.ambassadorId.toString())
//       );
//     }

//     // Create new invitations for ambassadors without existing or declined invitations
//     const newInvitations = ambassadors
//       .filter(
//         (amb) =>
//           !existingAmbassadorIds.includes(amb._id.toString()) &&
//           !updatedDeclined.includes(amb._id.toString())
//       )
//       .map((ambassador) => ({
//         campaignId,
//         brandId,
//         ambassadorId: ambassador._id,
//       }));

//     let totalInvitations = updatedDeclined.length;
//     if (newInvitations.length > 0) {
//       await InviteAmbassadors.insertMany(newInvitations);
//       totalInvitations += newInvitations.length;
//     }

//     if (totalInvitations === 0) {
//       return NextResponse.json(
//         {
//           message:
//             "All selected ambassadors have pending or accepted invitations",
//         },
//         { status: 400 }
//       );
//     }

//     return NextResponse.json(
//       {
//         message: `Invitations sent or re-sent to ${totalInvitations} ambassadors`,
//       },
//       { status: 200 }
//     );
//   } catch (error) {
//     console.error("Error inviting ambassadors:", error);
//     return NextResponse.json(
//       { message: error.message || "Server error" },
//       { status: 500 }
//     );
//   }
// }
