import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import createClient from "@/lib/supabase/server";
import { create } from "zustand";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request) {
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit"));
    const role = searchParams.get("role") || null;
    const search = searchParams.get("search") || null;
    const includeVat = searchParams.get("includeVat") === "true";
    const skip = limit > 0 ? (page - 1) * limit : 0;

    const query = { role: { $ne: "admin" }, isProfileCompleted: true };
    if (role && ["fan", "sports-ambassador", "brand"].includes(role)) {
      query.role = role;
    }

    // Add search functionality
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i"); // Case-insensitive search
      query.$or = [
        { email: searchRegex },
        { "brand.firstName": searchRegex },
        { "brand.lastName": searchRegex },
        { "brand.companyName": searchRegex },
        { "athlete.name": searchRegex },
        { "coach.name": searchRegex },
        { "team.name": searchRegex },
        { "influencer.name": searchRegex },
        { "exAthlete.name": searchRegex },
        { "paraAthlete.name": searchRegex },
      ];
    }

    let users;
    let total;

    // Determine which fields to select based on includeVat flag
    const selectFields = includeVat
      ? "email name supabaseId authProvider role subRole createdAt updatedAt stateId athlete coach team influencer exAthlete paraAthlete brand fan"
      : "email name supabaseId authProvider role subRole createdAt updatedAt stateId athlete.tracking_key coach.tracking_key team.tracking_key influencer.tracking_key exAthlete.tracking_key paraAthlete.tracking_key brand.tracking_key";

    if (limit === 0) {
      // Fetch all users
      users = await User.find(query)
        .select(selectFields)
        .lean()
        .sort({ createdAt: -1 });
      total = users.length;
    } else {
      // Fetch paginated users
      users = await User.find(query)
        .select(selectFields)
        .skip(skip)
        .limit(limit)
        .lean()
        .sort({ createdAt: -1 });
      total = await User.countDocuments(query);
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          users,
          pagination:
            limit > 0
              ? {
                  page,
                  limit,
                  total,
                  totalPages: Math.ceil(total / limit),
                }
              : undefined,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  // Create Supabase client and check session
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // Verify user is logged in
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

  try {
    // Connect to MongoDB
    await connectDB();

    // Parse request body
    const body = await request.json();
    const { userId, stateId, formData } = body;

    const mongoUser = await User.findOne({ supabaseId: userId });

    // Handle state update request
    if (stateId !== undefined) {
      return handleStateUpdate(mongoUser, userId, stateId);
    }

    // Handle form data update request
    if (formData) {
      return handleFormDataUpdate(userId, formData, mongoUser);
    }

    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in PUT handler:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handleStateUpdate(supabase, userId, stateId) {
  // Validate userId and stateId
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }
  if (![1, 2].includes(stateId)) {
    return NextResponse.json(
      {
        error: "Invalid stateId; must be 1 (active) or 2 (banned)",
      },
      { status: 400 }
    );
  }

  // Find and update the user
  const user = await User.findOne({ supabaseId: userId });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Update stateId at root level and in all sub-schemas
  user.stateId = stateId;

  const subSchemas = [
    "athlete",
    "team",
    "influencer",
    "brand",
    "exAthlete",
    "paraAthlete",
    "coach",
  ];

  for (const subSchema of subSchemas) {
    if (user[subSchema]) {
      user[subSchema].stateId = stateId;
    }
  }

  await user.save();

  return NextResponse.json({
    message:
      stateId === 2 ? "User banned successfully" : "User unbanned successfully",
    data: user,
  });
}

async function handleFormDataUpdate(userId, formData, mongoUser) {
  if (!userId || !formData) {
    return NextResponse.json(
      { error: "Missing userId or formData" },
      { status: 400 }
    );
  }

  const user = await User.findOne({ supabaseId: userId });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { role, subRole, isProfileCompleted } = formData;
  const profileType = subRole ? toCamelCase(subRole) : "brand";

  // Validate the profile type exists
  if (!user[profileType]) {
    return NextResponse.json(
      { error: "Invalid profile type for this user" },
      { status: 400 }
    );
  }

  // Prepare update object based on role
  let updateData = {
    role,
    isProfileCompleted:
      isProfileCompleted !== undefined
        ? isProfileCompleted
        : user.isProfileCompleted,
  };

  if (subRole) {
    updateData.subRole = subRole;
  }

  // Use dot notation for surgical updates to preserve existing fields like stripeAccountId, tracking_key, etc.
  if (role === "sports-ambassador" && formData[profileType]) {
    const profileData = formData[profileType];
    Object.keys(profileData).forEach((key) => {
      updateData[`${profileType}.${key}`] = profileData[key];
    });
  } else if (role === "brand" && formData.brand) {
    const brandData = formData.brand;
    Object.keys(brandData).forEach((key) => {
      updateData[`brand.${key}`] = brandData[key];
    });
  }

  // Update the user using findOneAndUpdate with mongoUser._id if available, or filter by userId
  const updatedUser = await User.findOneAndUpdate(
    { _id: mongoUser?._id || user._id },
    { $set: updateData },
    { new: true }
  );

  return NextResponse.json({
    message: "Profile updated successfully",
    data: updatedUser,
  });
}

function toCamelCase(str) {
  return str
    .split("-")
    .map((word, index) =>
      index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join("");
}

export async function DELETE(request) {
  try {
    await connectDB();
    const supabase = await createClient();
    const supabaseAdmin = await createAdminClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user?.user_metadata?.is_super_admin) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }
    const mongoUser = await User.findOne({ supabaseId: id });
    if (mongoUser) {
      const { error: supabaseError } =
        await supabaseAdmin.auth.admin.deleteUser(id);

      if (supabaseError) {
        return NextResponse.json(
          {
            error: "Failed to delete Supabase user",
            details: supabaseError.message,
          },
          { status: 500 }
        );
      }
    }
    const data = await User.findByIdAndDelete(mongoUser._id);
    if (!data) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "User deleted successfully.", data },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
