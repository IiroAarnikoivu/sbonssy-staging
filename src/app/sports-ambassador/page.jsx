"use client";

import Dashboard from "@/components/Dashboard/Dashboard";
import SidebarSports from "@/components/SidebarSports";
import { useAuthStore } from "@/store/authStore";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const Home = () => {
  const t = useTranslations("Common");
  return (
    <div className="flex flex-col bg-black min-h-screen">
      <div className="flex flex-1 relative">
        <div className="hidden lg:block">
          <SidebarSports />
        </div>

        <div className="flex-1 p-4 pt-8 md:p-6 md:pt-10 justify-center flex h-fit items-center">
          <Dashboard role="sports-ambassador" />
        </div>
      </div>
    </div>
  );
};
export default Home;
