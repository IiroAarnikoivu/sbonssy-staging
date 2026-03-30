// import { connectDB } from "@/lib/db";
// import User from "@/models/User";
// import Campaign from "@/models/Campaign";
// import CampaignRequest from "@/models/CampaignRequest";
// import createClient from "@/lib/supabase/server";

// export async function POST(request) {
//   try {
//     await connectDB();
//     const supabase = await createClient();

//     // Authenticate user
//     const {
//       data: { user: authUser },
//       error: authError,
//     } = await supabase.auth.getUser();

//     if (authError || !authUser?.id) {
//       return new Response(
//         JSON.stringify({ message: "Unauthorized: Authentication failed" }),
//         {
//           status: 401,
//           headers: { "Content-Type": "application/json" },
//         }
//       );
//     }

//     // Parse request body
//     const { campaignId, brandId, userId } = await request.json();

//     // Validate required fields
//     if (!campaignId || !brandId || !userId) {
//       return new Response(
//         JSON.stringify({ message: "Missing required fields" }),
//         {
//           status: 400,
//           headers: { "Content-Type": "application/json" },
//         }
//       );
//     }

//     // Verify the requesting user matches the authenticated user
//     const dbUser = await User.findById(userId);
//     if (!dbUser || dbUser.email !== authUser.email) {
//       return new Response(
//         JSON.stringify({ message: "Unauthorized: User mismatch" }),
//         {
//           status: 403,
//           headers: { "Content-Type": "application/json" },
//         }
//       );
//     }

//     // Check if campaign exists and belongs to the brand
//     const campaign = await Campaign.findOne({
//       brandId: brandId,
//       _id: campaignId,
//     });
//     if (!campaign) {
//       return new Response(
//         JSON.stringify({ message: "Campaign not found or invalid brand" }),
//         {
//           status: 404,
//           headers: { "Content-Type": "application/json" },
//         }
//       );
//     }

//     // Check for existing request
//     const existingRequest = await CampaignRequest.findOne({
//       campaign: campaignId,
//       user: userId,
//       brand: brandId,
//     });

//     if (existingRequest) {
//       // If request exists and is pending, return conflict
//       // if (existingRequest.isPending) {
//       //   return new Response(
//       //     JSON.stringify({ message: "Request already pending" }),
//       //     {
//       //       status: 409,
//       //       headers: { "Content-Type": "application/json" },
//       //     }
//       //   );
//       // }
//       // If request exists but was cancelled, update to pending
//       if (existingRequest.isCancelled) {
//         existingRequest.status = 0;
//         await existingRequest.save();
//       }
//     } else {
//       // Create new request
//       await CampaignRequest.create({
//         campaign: campaignId,
//         user: userId,
//         brand: brandId,
//         status: 1, // Pending
//       });
//     }

//     // Here you would typically send the actual notification to the brand
//     // This could be via email, websocket, or another notification system
//     // For now, we'll just return success

//     return new Response(
//       JSON.stringify({
//         message: "Join request sent successfully",
//         status: 1, // Pending status
//       }),
//       {
//         status: 200,
//         headers: { "Content-Type": "application/json" },
//       }
//     );
//   } catch (e) {
//     return new Response(JSON.stringify({ message: "Internal server error" }), {
//       status: 500,
//       headers: { "Content-Type": "application/json" },
//     });
//   }
// }

// export async function GET() {
//   try {
//     await connectDB();
//     const supabase = await createClient();

//     // Authenticate user
//     const {
//       data: { user: authUser },
//       error: authError,
//     } = await supabase.auth.getUser();

//     if (authError || !authUser?.id) {
//       return new Response(
//         JSON.stringify({ message: "Unauthorized: Authentication failed" }),
//         {
//           status: 401,
//           headers: { "Content-Type": "application/json" },
//         }
//       );
//     }

//     // Find the brand user in database
//     const brandUser = await User.findOne({ email: authUser.email });

//     if (!brandUser || !brandUser.brand) {
//       return new Response(
//         JSON.stringify({ message: "User is not associated with any brand" }),
//         {
//           status: 403,
//           headers: { "Content-Type": "application/json" },
//         }
//       );
//     }

//     // Get all campaign requests for this brand
//     const requests = await CampaignRequest.find({
//       brand: brandUser._id, // Only requests for this brand's campaigns
//       status: 1, // Only pending requests (change if you want all statuses)
//     })
//       .populate({
//         path: "user",
//         // select: "email subRole onboardedDetails",
//         // populate: {
//         //   path: "onboardedDetails",
//         //   select: "name profilePhoto", // Adjust fields as needed
//         // },
//       })
//       .populate({
//         path: "campaign",
//         select: "basics assets brandId", // Adjust fields as needed
//         populate: {
//           path: "brandId",
//           select: "brand", // Assuming brandId has a brand reference
//         },
//       })
//       .sort({ createdAt: -1 }); // Newest first

//     // Format the response data
//     const formattedRequests = requests.map((request) => {
//       const subRole = request.user.subRole; // 'creator', 'influencer', etc.
//       const name = request.user[subRole]?.name || "Unknown";

//       return {
//         _id: request._id,
//         sender: {
//           _id: request.user._id,
//           email: request.user.email,
//           subRole: subRole,
//           name: name,
//         },
//         campaign: {
//           _id: request.campaign._id,
//           title: request.campaign.basics?.title || "Untitled",
//           logo: request.campaign.assets?.logos?.[0]?.url || null,
//           brandName:
//             request.campaign.brandId?.brand?.companyName || "Unknown Brand",
//         },
//         status: request.status,
//         createdAt: request.createdAt,
//         updatedAt: request.updatedAt,
//       };
//     });

//     return new Response(JSON.stringify({ requests: formattedRequests }), {
//       status: 200,
//       headers: { "Content-Type": "application/json" },
//     });
//   } catch (e) {
//     console.error("Error fetching brand requests:", e);
//     return new Response(JSON.stringify({ message: "Internal server error" }), {
//       status: 500,
//       headers: { "Content-Type": "application/json" },
//     });
//   }
// }
