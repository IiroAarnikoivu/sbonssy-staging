import FAQ from "@/models/FAQ";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import User from "@/models/User";

// GET: Get Single FAQ by ID (Detail Endpoint)
export async function GET(request, { params }) {
  try {
    await connectDB();
    const faq = await FAQ.findById(params.id).populate("author", "name email");
    if (!faq) {
      return NextResponse.json({ message: "FAQ not found" }, { status: 404 });
    }
    return NextResponse.json({
      message: "FAQ retrieved successfully",
      faq,
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching FAQ", error: error.message },
      { status: 500 }
    );
  }
}

// PUT: Update FAQ
export async function PUT(request, { params }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin using is_super_admin from user_metadata
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
    const userId = mongoUser._id;

    const faq = await FAQ.findOneAndUpdate(
      { _id: params.id, author: userId },
      { $set: { question, answer } },
      { new: true, runValidators: true }
    );

    if (!faq) {
      return NextResponse.json(
        { message: "FAQ not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "FAQ updated successfully", faq },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error updating FAQ", error: error.message },
      { status: 400 }
    );
  }
}

// DELETE: Delete FAQ
export async function DELETE(request, { params }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin using is_super_admin from user_metadata
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
    const userId = mongoUser._id;

    const faq = await FAQ.findOneAndDelete({
      _id: params.id,
      author: userId,
    });

    if (!faq) {
      return NextResponse.json(
        { message: "FAQ not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "FAQ deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { message: "Error deleting FAQ", error: error.message },
      { status: 500 }
    );
  }
}
