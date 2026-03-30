import { connectDB } from "@/lib/db";
import createClient from "@/lib/supabase/server";
import Help from "@/models/Help";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    const { id } = await params;
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
    const data = await Help.findOne({ _id: id });

    if (!data) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    // Optional locale mapping
    const { searchParams } = new URL(request.url);
    const localeParam = (searchParams.get("locale") || "").toLowerCase();
    const locale = ["en", "fi"].includes(localeParam) ? localeParam : null;

    if (locale) {
      const obj = data.toObject({ virtuals: true });
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
      return NextResponse.json(
        {
          message: "Fetched Successfully",
          data: { ...obj, title, description },
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        message: "Fetched Successfully",
        data: data,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        message: "Internal Sever Error",
        error: error.message || String(error),
      },
      { status: 500 }
    );
  }
}
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

    const data = await Help.findOneAndDelete({
      _id: params.id,
    });

    if (!data) {
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
    const body = await request.json();
    let { title, userType, description } = body || {};

    const normalizeLocalized = (val, field) => {
      if (val && typeof val === "object") {
        const en = val.en;
        const fi = val.fi;
        if (!en) {
          throw new Error(
            `Both English (${field}.en) and Finnish (${field}.fi) are required when updating ${field}`
          );
        }
        return { en, fi };
      } else if (typeof val === "string") {
        return { en: val, fi: val };
      } else if (val === undefined) {
        return undefined;
      } else {
        throw new Error(`Invalid ${field} provided`);
      }
    };

    try {
      title = normalizeLocalized(title, "title");
      description = normalizeLocalized(description, "description");
    } catch (e) {
      return NextResponse.json({ message: e.message }, { status: 400 });
    }

    const updateDoc = {};
    if (title) updateDoc.title = title;
    if (typeof userType === "string") updateDoc.userType = userType;
    if (description) updateDoc.description = description;

    const faq = await Help.findOneAndUpdate(
      { _id: params.id },
      { $set: updateDoc },
      { new: true, runValidators: true }
    );

    if (!faq) {
      return NextResponse.json(
        { message: "Data not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Data updated successfully", faq },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error updating Data", error: error.message },
      { status: 400 }
    );
  }
}
