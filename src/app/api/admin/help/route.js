import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import Help from "@/models/Help";
import User from "@/models/User";
import { NextResponse } from "next/server";

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

    const body = await request.json();
    let { title, userType, description } = body || {};

    await connectDB();

    // Normalize title and description to localized objects {en, fi}
    const normalizeLocalized = (val, field) => {
      if (val && typeof val === "object") {
        const en = val.en;
        const fi = val.fi;
        if (!en) {
          throw new Error(
            `Both English (${field}.en) and Finnish (${field}.fi) are required`
          );
        }
        return { en, fi };
      } else if (typeof val === "string") {
        return { en: val, fi: val };
      } else {
        throw new Error(`Invalid ${field} provided`);
      }
    };

    try {
      title = normalizeLocalized(title, "title");
      description = normalizeLocalized(description, "description");
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }

    const helpData = new Help({
      title,
      userType,
      description,
    });

    await helpData.save();

    return NextResponse.json(
      { message: "Added", data: helpData },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "error adding", error: error.message || String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const userType = searchParams.get("userType");
    const show = searchParams.get("show");
    const localeParam = (searchParams.get("locale") || "").toLowerCase();
    const locale = ["en", "fi"].includes(localeParam) ? localeParam : null;

    // Build query
    const query = {};
    if (userType && userType !== "all") {
      query.userType = userType;
    }

    let data;
    let total;

    if (show === "all") {
      data = await Help.find(query);
      total = data.length;
    } else {
      const skip = (page - 1) * limit;
      data = await Help.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      total = await Help.countDocuments(query);
    }

    // Map localized fields to strings when locale is provided
    const mapped = locale
      ? data.map((d) => {
          const obj = d.toObject({ virtuals: true });
          const title =
            typeof obj.title === "object"
              ? obj.title?.[locale] || obj.title?.en || obj.title?.fi
              : obj.title;
          const description =
            typeof obj.description === "object"
              ? obj.description?.[locale] ||
                obj.description?.en ||
                obj.description?.fi
              : obj.description;
          return { ...obj, title, description };
        })
      : data;

    return NextResponse.json(
      {
        message: "fetched successfully!",
        data: mapped,
        ...(show !== "all" && {
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        }),
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "error fetching", error: error.message || String(error) },
      { status: 500 }
    );
  }
}
