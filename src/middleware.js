import { NextResponse } from "next/server";
import createClient from "./lib/supabase/server";

const ROLE_BASED_ROUTES = {
  brand: "/brand",
  admin: "/admin",
  "sports-ambassador": "/sports-ambassador",
  fan: "/fan",
};

export const middleware = async (req) => {
  const { pathname } = new URL(req.url);
  const res = NextResponse.next();

  // Visitor ID persistence logic
  let visitorId = req.cookies.get("sbonssy_visitor_id")?.value;
  if (!visitorId) {
    visitorId = `VIS_${crypto.randomUUID().replace(/-/g, "").toUpperCase()}`;
    res.cookies.set("sbonssy_visitor_id", visitorId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: "lax",
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const meta = user?.user_metadata || {};
  // Prefer cookies set by OAuth callback to avoid stale metadata on the first hit
  const cookieRole = req.cookies.get("role")?.value;
  const cookieCompletedRaw = req.cookies.get("isProfileCompleted")?.value;
  const cookieCompleted =
    typeof cookieCompletedRaw === "string"
      ? cookieCompletedRaw === "true"
      : undefined;

  const userRole = cookieRole || meta.role;
  const isProfileCompleted =
    cookieCompleted !== undefined ? cookieCompleted : meta.isProfileCompleted;
  const isEmailVerified = !!user?.email_confirmed_at;

  const isAuthPage = pathname === "/authentication";
  const isOnboardingPage = pathname.startsWith("/onboarding/");
  const isVerifyOtpPage = pathname === "/verify-otp";
  const roleRoute = userRole ? ROLE_BASED_ROUTES[userRole] : null;

  // Check if admin is accessing brand campaign with admin parameter
  const isAdminAccessingBrandCampaign =
    userRole === "admin" &&
    pathname.startsWith("/brand/campaign/") &&
    req.nextUrl.searchParams.get("admin") === "true";

  const isUserOnCorrectRolePage =
    roleRoute &&
    (pathname === roleRoute ||
      pathname.startsWith(`${roleRoute}/`) ||
      isAdminAccessingBrandCampaign);

  const isProtectedRoute = Object.values(ROLE_BASED_ROUTES).some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // 1. 🚫 If NOT authenticated, redirect protected routes to login
  if (!user && (isProtectedRoute || isOnboardingPage) && !isAuthPage) {
    return NextResponse.redirect(new URL("/authentication", req.url));
  }

  // 2. 🚫 If authenticated but NOT verified, redirect to /verify-otp
  if (user && !isEmailVerified && !isVerifyOtpPage && !isAuthPage) {
    return NextResponse.redirect(new URL("/verify-otp", req.url));
  }

  // 3. ✅ If authenticated AND verified, prevent access to /verify-otp or /authentication
  if (user && isEmailVerified && (isAuthPage || isVerifyOtpPage) && roleRoute) {
    return NextResponse.redirect(new URL(roleRoute, req.url));
  }

  // 4. Handle authenticated & verified routing
  if (user && isEmailVerified) {
    // Redirect to correct role route if profile completed but on wrong route
    if (
      userRole &&
      !isUserOnCorrectRolePage &&
      !isOnboardingPage &&
      !isAuthPage &&
      !user?.is_super_admin
    ) {
      return NextResponse.redirect(new URL(`/${userRole}`, req.url));
    }

    // Redirect completed users away from onboarding
    if (userRole && isProfileCompleted && isOnboardingPage) {
      return NextResponse.redirect(new URL(roleRoute, req.url));
    }

    // Redirect to onboarding if profile not completed
    if (userRole && !isProfileCompleted && !isOnboardingPage && !isAuthPage) {
      const needsOnboarding = ["brand", "sports-ambassador"].includes(userRole);
      if (needsOnboarding) {
        return NextResponse.redirect(
          new URL(`/onboarding/${userRole}`, req.url)
        );
      }
    }
  }

  return res;
};

export const config = {
  matcher: [
    "/brand/:path*",
    "/admin/:path*",
    "/fan/:path*",
    "/sports-ambassador/:path*",
    "/authentication",
    "/onboarding/:path*",
    "/verify-otp",
    "/campaign/:path*",
  ],
};
