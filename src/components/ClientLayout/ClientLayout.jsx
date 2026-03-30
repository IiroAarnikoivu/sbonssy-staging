"use client";

import React from "react";
import Header from "../Common/Header/Header";
import Footer from "../Common/Footer/Footer";
import { usePathname } from "next/navigation";
import RoleSidebar from "@/components/RoleSidebar";

export default function ClientLayout({ children }) {
  const pathname = usePathname();

  const showHeaderFooter =
    !pathname.includes("/authentication") && !pathname.includes("/signup");

  // Route categories
  const isAuth =
    pathname.includes("/authentication") || pathname.includes("/signup");
  const isOnboarding = pathname.startsWith("/onboarding");
  const isAdmin = pathname.startsWith("/admin");

  // Pages with transparent header (hero sections) - these DON'T need padding
  const pagesWithTransparentHeader = [
    "/",
    "/fans",
    "/athletes-teams",
    "/brands",
    "/features"
  ];

  const hasTransparentHeader = pagesWithTransparentHeader.includes(pathname);

  // All other pages need padding under the fixed header
  // Except auth, admin, and onboarding pages
  const needsHeaderPadding = !hasTransparentHeader && !isAuth && !isAdmin && !isOnboarding;

  return (
    <div className="w-full overflow-x-hidden">
      {showHeaderFooter && <Header />}
      {/* Spacer for fixed header on pages with white backgrounds */}
      {needsHeaderPadding && <div className="h-[10px] lg:h-[36px] mb-6 md:mb-8" />}
      {/* Global role-aware sidebar for dashboard sections (mobile-first) */}
      <RoleSidebar />
      <div className="w-full overflow-x-hidden">
        {children}
      </div>

      {/* Footer: hide on authentication, onboarding, and admin pages */}
      {!isAuth && !isOnboarding && !isAdmin && <Footer />}
      {(isAuth || isOnboarding) && (
        <div className="py-4 text-center mt-6 lg:mt-8 left-0 right-0 m-auto">
          © {new Date().getFullYear()} Sbonssy
        </div>
      )}
    </div>
  );
}
