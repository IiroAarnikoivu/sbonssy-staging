import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Invoice from "@/models/Invoice";
import User from "@/models/User";
import createClient from "@/lib/supabase/server";

export async function GET(request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user?.user_metadata?.is_super_admin) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 },
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 50;
    const includeVat = searchParams.get("includeVat") === "true";
    const skip = (page - 1) * limit;

    // Build aggregation pipeline
    const pipeline = [
      {
        $lookup: {
          from: "users",
          localField: "brandId",
          foreignField: "_id",
          as: "brand",
          pipeline: [
            {
              $project: {
                name: 1,
                email: 1,
                role: 1,
                brand: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$brand",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ];

    // Add pagination if not fetching all
    if (limit > 0) {
      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: limit });
    }

    const invoices = await Invoice.aggregate(pipeline);
    const total = await Invoice.countDocuments();

    return NextResponse.json({
      success: true,
      invoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Admin invoices fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices", details: error.message },
      { status: 500 },
    );
  }
}
