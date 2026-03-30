import Blog from "@/models/Blog";
import Tag from "@/models/Tag";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import User from "@/models/User";

// GET: Get Single Blog by ID (Detail Endpoint)
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    await connectDB();
    const { searchParams } = new URL(request.url);
    const localeParam = (searchParams.get("locale") || "").toLowerCase();
    const locale = ["en", "fi"].includes(localeParam) ? localeParam : null;
    const blog = await Blog.findById(id)
      .populate("author", "name email")
      .populate("tags", "name");
    if (!blog) {
      return NextResponse.json({ message: "Blog not found" }, { status: 404 });
    }
    // If locale provided, map localized fields to strings
    if (locale) {
      const obj = blog.toObject({ virtuals: true });
      const localizedTitle =
        typeof obj.title === "object"
          ? obj.title?.[locale] || obj.title?.en || obj.title?.fi
          : obj.title;
      const localizedContent =
        typeof obj.content === "object"
          ? obj.content?.[locale] || obj.content?.en || obj.content?.fi
          : obj.content;
      return NextResponse.json({
        message: "Blog retrieved successfully",
        blog: { ...obj, title: localizedTitle, content: localizedContent },
      });
    }
    return NextResponse.json({
      message: "Blog retrieved successfully",
      blog,
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching blog", error: error.message },
      { status: 500 },
    );
  }
}

// PUT: Update Blog
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
        { status: 403 },
      );
    }

    // Ensure DB connection before using any models
    await connectDB();

    const mongoUser = await User.findOne({ supabaseId: user?.id });

    const body = await request.json();
    const {
      title,
      content,
      titleEn,
      titleFi,
      contentEn,
      contentFi,
      tags,
      status,
      image,
    } = body || {};

    // Prepare $set update document
    const updateDoc = {};

    // Build and validate localized title if being updated
    const isUpdatingTitleNested = title && typeof title === "object";
    const isUpdatingTitleLegacy =
      titleEn !== undefined || titleFi !== undefined;
    if (isUpdatingTitleNested || isUpdatingTitleLegacy) {
      const localizedTitle = isUpdatingTitleNested
        ? { en: title.en, fi: title.fi }
        : { en: titleEn, fi: titleFi };

      if (!localizedTitle?.en || !localizedTitle?.fi) {
        return NextResponse.json(
          {
            message:
              "Both English (title.en or titleEn) and Finnish (title.fi or titleFi) titles are required when updating title",
          },
          { status: 400 },
        );
      }
      updateDoc.title = localizedTitle;
    }

    // Build and validate localized content if being updated
    const isUpdatingContentNested = content && typeof content === "object";
    const isUpdatingContentLegacy =
      contentEn !== undefined || contentFi !== undefined;
    if (isUpdatingContentNested || isUpdatingContentLegacy) {
      const localizedContent = isUpdatingContentNested
        ? { en: content.en, fi: content.fi }
        : { en: contentEn, fi: contentFi };

      if (!localizedContent?.en || !localizedContent?.fi) {
        return NextResponse.json(
          {
            message:
              "Both English (content.en or contentEn) and Finnish (content.fi or contentFi) content are required when updating content",
          },
          { status: 400 },
        );
      }
      updateDoc.content = localizedContent;
    }

    // Validate tags if provided
    if (tags && tags.length > 0) {
      const validTags = await Tag.find({ _id: { $in: tags } });
      if (validTags.length !== tags.length) {
        return NextResponse.json(
          { message: "Invalid tags provided" },
          { status: 400 },
        );
      }
      updateDoc.tags = tags;
    }

    if (status !== undefined) updateDoc.status = status;
    if (image !== undefined) updateDoc.image = image;

    if (Object.keys(updateDoc).length === 0) {
      return NextResponse.json(
        { message: "No valid fields provided to update" },
        { status: 400 },
      );
    }

    const { id } = await params;
    const blog = await Blog.findOneAndUpdate(
      { _id: id },
      { $set: updateDoc },
      { new: true, runValidators: true },
    );

    if (!blog) {
      return NextResponse.json(
        { message: "Blog not found or unauthorized" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "Blog updated successfully", blog },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error updating blog", error: error.message },
      { status: 400 },
    );
  }
}

// DELETE: Delete Blog
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
        { status: 403 },
      );
    }

    const mongoUser = await User.findOne({
      supabaseId: user?.id,
    });

    await connectDB();

    const { id } = await params;
    const blog = await Blog.findOneAndDelete({
      _id: id,
    });

    if (!blog) {
      return NextResponse.json(
        { message: "Blog not found or unauthorized" },
        { status: 404 },
      );
    }

    return NextResponse.json({ message: "Blog deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { message: "Error deleting blog", error: error.message },
      { status: 500 },
    );
  }
}
