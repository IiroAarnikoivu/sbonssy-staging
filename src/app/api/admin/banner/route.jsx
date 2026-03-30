import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import Banner from "@/models/Banner";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const locale = (searchParams.get("locale") || "en").toLowerCase();

    // Include both description and content (alias of description) in response
    const docs = await Banner.find();
    const data = docs.map((b) => b.toLocaleObject(locale));

    return NextResponse.json({
      data: { data: data, message: "fetched successfully" },
      status: 200,
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Server Error", error: error.message },
      { status: 500 }
    );
  }
}

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

    const { title, description, image, ctaOne, ctaTwo } = await request.json();
    const userId = mongoUser?._id;
    const banner = new Banner({
      title,
      description,
      image,
      author: userId,
      ctaOne,
      ctaTwo,
    });
    await banner.save();
    return NextResponse.json({
      data: { data: banner, message: "banner added successfully" },
    });
  } catch (error) {
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}
