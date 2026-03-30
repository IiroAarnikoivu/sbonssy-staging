"use client";

import React from "react";
import { useAuthStore } from "@/store/authStore";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar"; // Brand
import SidebarSports from "@/components/SidebarSports"; // Sports Ambassador
import SidebarFan from "@/components/SidebarFan"; // Fan

/**
 * Role-aware sidebar wrapper rendered globally in ClientLayout.
 * Only shown on authenticated dashboard routes and hidden on admin.
 */
export default function RoleSidebar() {
  const { user } = useAuthStore();
  const pathname = usePathname();

  // Do not render on admin area or when no user
  if (!user || pathname.includes("/admin")) return null;

  // Show on all routes for logged-in users (except admin)

  const role = user?.onboardedDetails?.role || user?.role;

  return (
    // Render only on mobile/tablet; hide on large screens to avoid duplicate desktop sidebars
    <div className="lg:hidden">
      {role === "brand" && <Sidebar />}
      {role === "sports-ambassador" && <SidebarSports />}
      {role === "fan" && <SidebarFan />}
    </div>
  );
}
