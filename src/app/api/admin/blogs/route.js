import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import Blog from "@/models/Blog";
import Tag from "@/models/Tag";
import User from "@/models/User";
import { NextResponse } from "next/server";

// POST: Create Blog
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

    // Ensure DB connection before using any Mongoose models
    await connectDB();

    // Find Mongo user mapped to Supabase user
    const mongoUser = await User.findOne({ supabaseId: user?.id });

    // Parse and normalize request body for localized fields
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

    // Build localized structures supporting both nested and legacy flat inputs
    const localizedTitle =
      title && typeof title === "object"
        ? { en: title.en, fi: title.fi }
        : { en: titleEn, fi: titleFi };

    const localizedContent =
      content && typeof content === "object"
        ? { en: content.en, fi: content.fi }
        : { en: contentEn, fi: contentFi };

    // Basic validation for presence of both locales
    if (!localizedTitle?.en || !localizedTitle?.fi) {
      return NextResponse.json(
        {
          message:
            "Both English (title.en or titleEn) and Finnish (title.fi or titleFi) titles are required",
        },
        { status: 400 }
      );
    }

    if (!localizedContent?.en || !localizedContent?.fi) {
      return NextResponse.json(
        {
          message:
            "Both English (content.en or contentEn) and Finnish (content.fi or contentFi) content are required",
        },
        { status: 400 }
      );
    }

    // Validate tags if provided
    if (tags && tags.length > 0) {
      const validTags = await Tag.find({ _id: { $in: tags } });
      if (validTags.length !== tags.length) {
        return NextResponse.json(
          { message: "Invalid tags provided" },
          { status: 400 }
        );
      }
    }

    const blog = new Blog({
      title: localizedTitle,
      content: localizedContent,
      author: mongoUser?._id,
      tags,
      status,
      image,
    });

    await blog.save();
    return NextResponse.json(
      { message: "Blog created successfully", blog },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error creating blog", error: error.message },
      { status: 400 }
    );
  }
}

// GET: Get All Blogs with optional tag filtering
export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status") || null;
    const tagFilter = searchParams.get("tag") || null;
    const localeParam = (searchParams.get("locale") || "").toLowerCase();
    const locale = ["en", "fi"].includes(localeParam) ? localeParam : null;

    // Build the query object
    const query = {};

    // Add status filter if provided
    if (status) {
      query.status = status;
    }

    // Add tag filter if provided
    if (tagFilter) {
      // Try to interpret tagFilter as an ObjectId first
      let tag = null;
      try {
        if (tagFilter.match(/^[0-9a-fA-F]{24}$/)) {
          tag = await Tag.findById(tagFilter);
        }
      } catch (_) {}

      // If not an ObjectId or not found, try by localized name
      if (!tag) {
        if (locale) {
          // Match specific locale field
          const nameKey = `name.${locale}`;
          tag = await Tag.findOne({ [nameKey]: tagFilter });
        } else {
          // Fallback: try both en and fi
          tag = await Tag.findOne({
            $or: [{ "name.en": tagFilter }, { "name.fi": tagFilter }],
          });
        }
      }

      if (tag) {
        query.tags = tag._id;
      } else {
        // If tag doesn't exist, return empty result
        return NextResponse.json({
          message: "No blogs found with the specified tag",
          blogs: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        });
      }
    }

    const skip = (page - 1) * limit;
    const blogs = await Blog.find(query)
      .populate("author", "name email avatar")
      .populate("tags", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Blog.countDocuments(query);

    // If locale is provided, map title/content to localized strings while preserving other fields
    const mappedBlogs = locale
      ? blogs.map((b) => {
          const obj = b.toObject({ virtuals: true });
          const localizedTitle =
            typeof obj.title === "object"
              ? obj.title?.[locale] || obj.title?.en || obj.title?.fi
              : obj.title;
          const localizedContent =
            typeof obj.content === "object"
              ? obj.content?.[locale] || obj.content?.en || obj.content?.fi
              : obj.content;
          return { ...obj, title: localizedTitle, content: localizedContent };
        })
      : blogs;

    return NextResponse.json({
      message: "Blogs retrieved successfully",
      blogs: mappedBlogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching blogs", error: error.message },
      { status: 500 }
    );
  }
}
