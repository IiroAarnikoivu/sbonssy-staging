import Tag from "@/models/Tag";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";

// GET: Get Single Tag by ID (Detail Endpoint)
export async function GET(request, { params }) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const localeParam = (searchParams.get("locale") || "").toLowerCase();
    const locale = ["en", "fi"].includes(localeParam) ? localeParam : null;

    const tag = await Tag.findById(params.id);
    if (!tag) {
      return NextResponse.json({ message: "Tag not found" }, { status: 404 });
    }

    if (locale) {
      const obj = tag.toObject({ virtuals: true });
      const localizedName =
        typeof obj.name === "object"
          ? obj.name?.[locale] || obj.name?.en || obj.name?.fi
          : obj.name;
      return NextResponse.json({
        message: "Tag retrieved successfully",
        tag: { ...obj, name: localizedName },
      });
    }

    return NextResponse.json({
      message: "Tag retrieved successfully",
      tag,
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching tag", error: error.message },
      { status: 500 }
    );
  }
}

// PUT: Update Tag
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

    await connectDB();
    const body = await request.json();
    const { name } = body || {};

    // Normalize name
    let localizedName;
    if (name && typeof name === "object") {
      localizedName = { en: name.en, fi: name.fi };
      if (!localizedName.en || !localizedName.fi) {
        return NextResponse.json(
          {
            message:
              "Both English (name.en) and Finnish (name.fi) are required when updating name",
          },
          { status: 400 }
        );
      }
    } else if (typeof name === "string") {
      localizedName = { en: name, fi: name };
    } else {
      return NextResponse.json(
        { message: "Invalid name provided" },
        { status: 400 }
      );
    }

    const tag = await Tag.findByIdAndUpdate(
      params.id,
      { name: localizedName },
      { new: true, runValidators: true }
    );

    if (!tag) {
      return NextResponse.json({ message: "Tag not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Tag updated successfully", tag },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error updating tag", error: error.message },
      { status: 400 }
    );
  }
}

// PATCH: Partially Update Tag
export async function PATCH(request, { params }) {
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

    await connectDB();
    const body = await request.json();
    const { name } = body || {};

    const updateDoc = {};

    if (name !== undefined) {
      let localizedName;
      if (name && typeof name === "object") {
        localizedName = { en: name.en, fi: name.fi };
        if (!localizedName.en || !localizedName.fi) {
          return NextResponse.json(
            {
              message:
                "Both English (name.en) and Finnish (name.fi) are required when updating name",
            },
            { status: 400 }
          );
        }
      } else if (typeof name === "string") {
        localizedName = { en: name, fi: name };
      } else {
        return NextResponse.json(
          { message: "Invalid name provided" },
          { status: 400 }
        );
      }
      updateDoc.name = localizedName;
    }

    if (Object.keys(updateDoc).length === 0) {
      return NextResponse.json(
        { message: "No valid fields provided to update" },
        { status: 400 }
      );
    }

    const tag = await Tag.findByIdAndUpdate(params.id, updateDoc, {
      new: true,
      runValidators: true,
    });

    if (!tag) {
      return NextResponse.json({ message: "Tag not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Tag updated successfully", tag },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error updating tag", error: error.message },
      { status: 400 }
    );
  }
}

// DELETE: Delete Tag
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

    await connectDB();
    const tag = await Tag.findByIdAndDelete(params.id);
    if (!tag) {
      return NextResponse.json({ message: "Tag not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Tag deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { message: "Error deleting tag", error: error.message },
      { status: 500 }
    );
  }
}
