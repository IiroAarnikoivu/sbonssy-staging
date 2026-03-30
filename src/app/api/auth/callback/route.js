import { NextResponse } from "next/server";
import createClient from "@/lib/supabase/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

/**
 * Handles the OAuth callback by verifying the state and code,
 * exchanging the code for a Supabase session, storing user info in MongoDB,
 * and redirecting the user based on their role.
 *
 * @param {Request} request - The incoming request object
 * @returns {NextResponse} - Redirect response to appropriate page
 */

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const roleParam = searchParams.get("role");

  if (!code) {
    return NextResponse.redirect(new URL("/error", request.url));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Error exchanging code for session:", error.message);
    return NextResponse.redirect(new URL("/error", request.url));
  }
  const { user } = data;

  let mongoUser;
  if (user) {
    // Ensure DB connection before using Mongoose models
    await connectDB();

    // Try to find existing Mongo user first
    try {
      mongoUser = await User.findOne({ supabaseId: user.id });
    } catch (e) {
      console.error("Mongo find user error:", e);
    }

    // Resolve role with priority: existing Mongo role > callback param > Supabase metadata > fan
    const roleToUse = mongoUser?.role || roleParam || user.user_metadata?.role || "fan";

    // Only update Supabase metadata if user is new or Mongo lacks a role
    if (!mongoUser || !mongoUser.role) {
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { role: roleToUse },
      });
      if (metadataError) {
        console.error("Error updating user metadata:", metadataError.message);
      }
    }

    // Create or complete Mongo user
    try {
      if (!mongoUser) {
        mongoUser = await User.create({
          email: user.email,
          supabaseId: user.id,
          authProvider: "google",
          role: roleToUse,
          name: user.user_metadata?.name || "",
          isProfileCompleted: false,
        });
      } else if (!mongoUser.role && roleToUse) {
        mongoUser.role = roleToUse;
        await mongoUser.save();
      }
    } catch (e) {
      if (e.code === 11000) {
        mongoUser = await User.findOne({ supabaseId: user.id });
      } else {
        console.error("Mongo user upsert error:", e);
      }
    }

    // Ensure Supabase metadata matches Mongo user (prevents middleware misroutes)
    if (mongoUser) {
      const desiredMeta = {
        role: mongoUser.role,
        isProfileCompleted: !!mongoUser.isProfileCompleted,
      };
      try {
        await supabase.auth.updateUser({ data: desiredMeta });
      } catch (e) {
        console.error("Failed to sync Supabase metadata:", e?.message || e);
      }
    }
  }

  // Build robust base URL for redirect
  const originFromReq = request.headers.get("origin");
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    originFromReq ||
    "http://localhost:3000";

  const redirectPath =
    mongoUser && mongoUser.isProfileCompleted
      ? `/${mongoUser.role}`
      : mongoUser && ["brand", "sports-ambassador"].includes(mongoUser.role)
      ? `/onboarding/${mongoUser.role}`
      : mongoUser && mongoUser.role
      ? `/${mongoUser.role}`
      : "/";

  // Redirect to appropriate page and prime cookies for middleware on first load
  const finalUrl = `${baseUrl.replace(/\/$/, "")}${redirectPath}`;
  const res = NextResponse.redirect(finalUrl);
  if (mongoUser) {
    try {
      res.cookies.set("role", mongoUser.role, {
        path: "/",
        httpOnly: false,
        sameSite: "lax",
        maxAge: 60, // 1 minute is enough to bridge the first redirect
      });
      res.cookies.set(
        "isProfileCompleted",
        String(!!mongoUser.isProfileCompleted),
        {
          path: "/",
          httpOnly: false,
          sameSite: "lax",
          maxAge: 60,
        }
      );
    } catch (_) {}
  }
  return res;
  // return NextResponse.redirect(new URL(`/onboarding/${role}`, request.url));
}
