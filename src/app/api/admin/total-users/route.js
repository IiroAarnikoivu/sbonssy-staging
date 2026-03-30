// import { connectDB } from "@/lib/db";
// import createClient from "@/lib/supabase/server";
// import User from "@/models/User";
// import { NextResponse } from "next/server";

// export async function GET() {
//   try {
//     const supabase = await createClient();

//     const {
//       data: {
//         user: {
//           user_metadata: { is_super_admin },
//         },
//       },
//     } = await supabase.auth.getUser();

//     if (!is_super_admin) {
//       return NextResponse.json({ message: "Forbidden" }, { status: 403 });
//     }
//     await connectDB();
//     const totalUser = await User.countDocuments({ isProfileCompleted: true });
//     const usersByMonth = await User.aggregate([
//       {
//         $match: { isProfileCompleted: true }, // Filter users with completed profiles
//       },
//       {
//         $group: {
//           _id: {
//             year: { $year: "$createdAt" },
//             month: { $month: "$createdAt" },
//           },
//           count: { $sum: 1 },
//         },
//       },
//       {
//         $sort: { "_id.year": 1, "_id.month": 1 },
//       },
//       {
//         $project: {
//           _id: 0,
//           year: "$_id.year",
//           month: "$_id.month",
//           count: 1,
//         },
//       },
//     ]);

//     return NextResponse.json(
//       { data: { count: totalUser, byMonth: usersByMonth } },
//       { status: 200 }
//     );
//   } catch (error) {
//     return NextResponse.json(
//       { message: "Internal Sever Error", error: error.message },
//       { status: 400 }
//     );
//   }
// }
import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const supabase = await createClient();
    const {
      data: {
        user: {
          user_metadata: { is_super_admin },
        },
      },
    } = await supabase.auth.getUser();

    if (!is_super_admin) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await connectDB();
    const totalUser = await User.countDocuments();

    // Get year from query parameter, default to current year if not provided
    const { searchParams } = new URL(request.url);
    const year = parseInt(
      searchParams.get("year") || new Date().getFullYear().toString()
    );

    // Validate year
    if (isNaN(year) || year < 2000 || year > new Date().getFullYear() + 1) {
      return NextResponse.json(
        { message: "Invalid year parameter" },
        { status: 400 }
      );
    }

    // Aggregate user counts by month for the specified year
    const usersByMonth = await User.aggregate([
      {
        $match: {
          // isProfileCompleted: true,
          createdAt: {
            $gte: new Date(year, 0, 1),
            $lt: new Date(year + 1, 0, 1),
          },
        },
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
      {
        $project: {
          month: "$_id",
          count: 1,
          _id: 0,
        },
      },
    ]);

    // Create an array of 12 months with 0 counts for months with no data
    const monthlyData = Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      count: 0,
    }));

    // Merge aggregation results with monthlyData
    usersByMonth.forEach((item) => {
      monthlyData[item.month - 1].count = item.count;
    });

    return NextResponse.json(
      {
        data: {
          count: totalUser,
          byMonth: monthlyData,
          year,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
