import Tag from "@/models/Tag";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";

// POST: Create Tag
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

    await connectDB();
    const body = await request.json();
    const { name } = body || {};

    // Normalize name: accept nested {en,fi} or string
    let localizedName;
    if (name && typeof name === "object") {
      localizedName = { en: name.en, fi: name.fi };
      if (!localizedName.en || !localizedName.fi) {
        return NextResponse.json(
          {
            message:
              "Both English (name.en) and Finnish (name.fi) are required",
          },
          { status: 400 }
        );
      }
    } else if (typeof name === "string") {
      // Backward compatibility: use same string for both locales
      localizedName = { en: name, fi: name };
    } else {
      return NextResponse.json(
        { message: "Invalid name provided" },
        { status: 400 }
      );
    }

    const tag = new Tag({ name: localizedName });
    await tag.save();
    return NextResponse.json(
      { message: "Tag created successfully", tag },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error creating tag", error: error.message },
      { status: 400 }
    );
  }
}

// GET: Get All Tags
export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const localeParam = (searchParams.get("locale") || "").toLowerCase();
    const locale = ["en", "fi"].includes(localeParam) ? localeParam : null;

    const skip = (page - 1) * limit;
    const tags = await Tag.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total = await Tag.countDocuments();

    const mappedTags = locale
      ? tags.map((t) => {
          const obj = t.toObject({ virtuals: true });
          const localizedName =
            typeof obj.name === "object"
              ? obj.name?.[locale] || obj.name?.en || obj.name?.fi
              : obj.name;
          return { ...obj, name: localizedName };
        })
      : tags;

    return NextResponse.json({
      message: "Tags retrieved successfully",
      tags: mappedTags,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching tags", error: error.message },
      { status: 500 }
    );
  }
}
