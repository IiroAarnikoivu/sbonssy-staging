import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import Banner from "@/models/Banner";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    // Connect to database
    await connectDB();

    // Authenticate user and check admin status
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user?.user_metadata?.is_super_admin) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    // Validate params.id
    const id = params?.id;
    if (!id) {
      return NextResponse.json(
        { message: "Banner ID is required" },
        { status: 400 }
      );
    }

    // Find banner by ID
    const banner = await Banner.findById(id);
    if (!banner) {
      return NextResponse.json(
        { message: "Banner not found" },
        { status: 404 }
      );
    }

    // If locale is provided, return locale-resolved object for viewing
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get("locale");
    if (locale) {
      return NextResponse.json({ data: banner.toLocaleObject(locale) }, { status: 200 });
    }

    // Default: return raw banner for editing
    return NextResponse.json({ data: banner }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Server Error", error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    // Connect to database
    await connectDB();

    // Authenticate user and check admin status
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user?.user_metadata?.is_super_admin) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    // Validate params.id
    const id = params?.id;
    if (!id) {
      return NextResponse.json(
        { message: "Banner ID is required" },
        { status: 400 }
      );
    }

    // Parse request body for update data
    const body = await request.json();
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json(
        { message: "Update data is required" },
        { status: 400 }
      );
    }

    // Update banner
    const updatedData = await Banner.findByIdAndUpdate(id, body, {
      new: true, // Return the updated document
      runValidators: true, // Ensure model validators are applied
    });

    if (!updatedData) {
      return NextResponse.json(
        { message: "Banner not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: updatedData }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Server Error", error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    // Connect to database
    await connectDB();

    // Authenticate user and check admin status
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user?.user_metadata?.is_super_admin) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    // Validate params.id
    const id = await params?.id;
    if (!id) {
      return NextResponse.json(
        { message: "Banner ID is required" },
        { status: 400 }
      );
    }

    // Delete banner
    const banner = await Banner.findByIdAndDelete(id);

    if (!banner) {
      return NextResponse.json(
        { message: "Banner not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Deleted Successfully", data: banner },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Server Error", error: error.message },
      { status: 500 }
    );
  }
}
