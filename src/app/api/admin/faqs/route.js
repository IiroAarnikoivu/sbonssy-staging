import FAQ from "@/models/FAQ";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import User from "@/models/User";

// POST: Create FAQ
export async function POST(request) {
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
        { status: 403 }
      );
    }

    const mongoUser = await User.findOne({
      supabaseId: user?.id,
    });

    await connectDB();
    const { question, answer } = await request.json();
    const userId = mongoUser?._id;

    const faq = new FAQ({
      question,
      answer,
      author: userId,
    });

    await faq.save();
    return NextResponse.json(
      { message: "FAQ created successfully", faq },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error creating FAQ", error: error.message },
      { status: 400 }
    );
  }
}

// GET: Get All FAQs
export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const skip = (page - 1) * limit;
    const faqs = await FAQ.find()
      .populate("author", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total = await FAQ.countDocuments();

    return NextResponse.json({
      message: "FAQs retrieved successfully",
      faqs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching FAQs", error: error.message },
      { status: 500 }
    );
  }
}
