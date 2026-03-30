import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import Campaign from "@/models/Campaign";

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
      return NextResponse.json({ message: "Forbidden" }, { status: 401 });
    }

    await connectDB();
    const totalCampaigns = await Campaign.countDocuments();
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

    // Aggregate campaign counts by month for the specified year
    const data = await Campaign.aggregate([
      {
        // Match documents for the specified year
        $match: {
          createdAt: {
            $gte: new Date(year, 0, 1),
            $lt: new Date(year + 1, 0, 1),
          },
        },
      },
      {
        // Group by month
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 },
        },
      },
      {
        // Sort by month
        $sort: { _id: 1 },
      },
      {
        // Project to format the output
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
    data.forEach((item) => {
      monthlyData[item.month - 1].count = item.count;
    });

    return NextResponse.json(
      {
        year,
        data: monthlyData,
        total: totalCampaigns,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
