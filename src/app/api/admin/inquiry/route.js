import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import Inquiry from "@/models/Inquiry";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    await connectDB();
    const supabase = await createClient();
    const supabaseUser = await supabase.auth.getUser();

    const {
      data: {
        user: {
          user_metadata: { is_super_admin },
        },
      },
    } = supabaseUser;

    if (!is_super_admin) {
      return NextResponse.json({ message: "Forbidden" }, { status: 400 });
    }
    const { searchParams } = new URL(request?.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;

    const skip = (page - 1) * limit;
    const total = await Inquiry.countDocuments();
    const data = await Inquiry.find()
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    return NextResponse.json(
      {
        data: {
          data: data,
          message: "fetched successfully",
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Server Error", error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    await connectDB();
    const supabase = await createClient();
    const supabaseUser = await supabase.auth.getUser();

    const {
      data: {
        user: {
          user_metadata: { is_super_admin },
        },
      },
    } = supabaseUser;

    if (!is_super_admin) {
      return NextResponse.json({ message: "Forbidden" }, { status: 400 });
    }
    const { searchParams } = new URL(request?.url);
    const id = searchParams.get("id");

    const data = await Inquiry.findByIdAndDelete({ _id: id });

    return NextResponse.json(
      {
        data: {
          data: data,
          message: "Deleted successfully",
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Server Error", error: error.message },
      { status: 500 }
    );
  }
}
