// import { NextResponse } from "next/server";
// import { connectDB } from "@/lib/db";
// import User from "@/models/User";
// import Campaign from "@/models/Campaign";
// import CampaignRequest from "@/models/CampaignRequest";
// import createClient from "@/lib/supabase/server";

// export async function GET(request) {
//   try {
//     const supabase = await createClient();
//     const {
//       data: { user },
//       error: authError,
//     } = await supabase.auth.getUser();

//     if (authError || !user) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     await connectDB();

//     const { searchParams } = new URL(request.url);
//     const page = parseInt(searchParams.get("page")) || 1;
//     const limit = parseInt(searchParams.get("limit")) || 10;
//     const skip = (page - 1) * limit;

//     // Step 1: Get all campaign IDs that are accepted
//     const acceptedRequests = await CampaignRequest.find({ status: 2 }).select(
//       "campaign"
//     );
//     const acceptedCampaignIds = acceptedRequests.map((req) =>
//       req.campaign.toString()
//     );

//     // Step 2: Query campaigns excluding accepted ones
//     const total = await Campaign.countDocuments({
//       _id: { $nin: acceptedCampaignIds },
//       "basics.campaignType": { $ne: "private" },
//     });

//     const campaigns = await Campaign.find({
//       _id: { $nin: acceptedCampaignIds },
//       "basics.campaignType": { $ne: "private" },
//     })
//       .populate({
//         path: "brandId",
//         model: User,
//         select: "brand",
//       })
//       // .skip(skip)
//       // .limit(limit)
//       .lean();

//     return NextResponse.json(
//       {
//         success: true,
//         data: campaigns,
//         pagination: {
//           page,
//           limit,
//           total,
//           totalPages: Math.ceil(total / limit),
//         },
//       },
//       { status: 200 }
//     );
//   } catch (error) {
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }
