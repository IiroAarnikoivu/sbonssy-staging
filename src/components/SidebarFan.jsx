"use client";

import { useAuthStore } from "@/store/authStore";
import IconsLibrary from "@/util/IconsLibrary";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useUIStore } from "@/store/uiStore";
import {
  FiBarChart2,
  FiHelpCircle,
  FiHome,
  FiMail,
  FiStar,
  FiTrendingUp,
  FiUser,
  FiUsers,
} from "react-icons/fi";

const SidebarFan = () => {
  const [isDashboardOpen, setIsDashboardOpen] = useState(true);
  const { isSidebarOpen, closeSidebar } = useUIStore();
  const router = useRouter();
  const { user } = useAuthStore();
  const sidebarRef = useRef(null);

  const role = user?.onboardedDetails?.role;
  const t = useTranslations("Sidebar");

  // Handle click outside to close mobile sidebar
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        isSidebarOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(e.target)
      ) {
        closeSidebar();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSidebarOpen, closeSidebar]);

  return (
    <>
      {/* Backdrop Overlay - Mobile Only */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[9998] lg:hidden transition-opacity duration-300"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={`fixed h-screen lg:sticky top-0 inset-y-0 left-0 max-w-[calc(100vw_-_150px)] transform
    ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
    lg:translate-x-0 right-0
    transition-transform duration-300 ease-in-out
    z-[9999] lg:z-[70]
    max-sm:w-full md:w-64
    bg-white border-r border-gray-200 flex flex-col`}
      >
        {/* Close Button */}
        <div className="flex justify-end pt-2 md:pt-4 pb-0 md:pb-4 lg:p-4 lg:hidden">
          <div className="margin-right md:margin-left">
            <button
              className={`lg:hidden p-2 text-gray-600 hover:text-gray-800 ${
                isSidebarOpen ? "block" : "hidden"
              }`}
              onClick={closeSidebar}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-2 mt-4 lg:mt-4">
          <ul className="space-y-2">
            <li
              className="flex items-center justify-between p-2 hover:bg-gray-100 rounded cursor-pointer"
              onClick={() => {
                router.push(`/fan`);
                setTimeout(() => closeSidebar(), 100);
              }}
            >
              <div className="flex items-center space-x-3">
                <FiHome className="w-6 h-6 min-w-6 max-w-6 var(--textColor)" />
                <span className="text-base leading-6 var(--textColor) font-normal">
                  {t("home")}
                </span>
              </div>
            </li>
            <li
              className="flex items-center justify-between p-2 hover:bg-gray-100 rounded cursor-pointer"
              onClick={() => {
                router.push("/fan/favourites");
                setTimeout(() => closeSidebar(), 100);
              }}
            >
              <div className="flex items-center space-x-3">
                <FiStar className="w-6 h-6 min-w-6 max-w-6 var(--textColor)" />
                <span className="text-base leading-6 var(--textColor) font-normal">
                  {t("saved")}
                </span>
              </div>
            </li>
          </ul>
        </nav>

        {/* Bottom Links */}
        <div className="p-4">
          <ul className="space-y-2">
            <li
              className="flex items-center w-fit space-x-3 p-2 hover:bg-gray-100 rounded cursor-pointer"
              onClick={() => {
                router.push(`/help-center`);
                setTimeout(() => closeSidebar(), 100);
              }}
            >
              <FiHelpCircle className="w-6 h-6 var(--textColor)" />
              <span className="text-base leading-6 var(--textColor) font-normal">
                {t("help-center")}
              </span>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
};

export default SidebarFan;
