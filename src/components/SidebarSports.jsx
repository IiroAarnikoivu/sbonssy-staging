"use client";

import { toCamelCase } from "@/lib/helper";
import { useAuthStore } from "@/store/authStore";
import IconsLibrary from "@/util/IconsLibrary";
import { buildAmbassadorSlug } from "@/util/buildAmbassadorSlug";
import { resolveAmbassadorSlug } from "@/util/resolveAmbassadorSlug";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useUIStore } from "@/store/uiStore";
import { useSocket } from "@/context/SocketContext";
import {
  FiHome,
  FiStar,
  FiBarChart2,
  FiTrendingUp,
  FiPieChart,
  FiCalendar,
  FiUsers,
  FiUser,
  FiMail,
  FiHelpCircle,
} from "react-icons/fi";

const SidebarSports = () => {
  const [isDashboardOpen, setIsDashboardOpen] = useState(true);
  const [unreadSenders, setUnreadSenders] = useState(0);
  const { isSidebarOpen, closeSidebar } = useUIStore();
  const router = useRouter();
  const { user } = useAuthStore();
  const sidebarRef = useRef(null);
  const socket = useSocket();
  const subRole = toCamelCase(user?.onboardedDetails?.subRole);
  const t = useTranslations("Sidebar");

  // Check if Stripe is setup for sports-ambassador
  // Uses the same logic as the marketplace visibility check (see /api/all-sports)
  const isStripeSetup = useMemo(() => {
    const details = user?.onboardedDetails;
    if (!details) return false;

    const subRoles = ["athlete", "team", "influencer", "coach", "exAthlete", "paraAthlete"];
    const subRoleKey = subRoles.find((k) => details?.[k]);
    if (!subRoleKey) return false;

    const stripeAccountId = details[subRoleKey]?.stripeAccountId;
    // Same logic as marketplace: stripeAccountId must exist and not be empty
    return !!(stripeAccountId && stripeAccountId.trim() !== "");
  }, [user]);

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

    // Use 'click' instead of 'mousedown' to allow menu items to handle their clicks first
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isSidebarOpen, closeSidebar]);

  // Unread badge: socket-driven updates (no polling)
  useEffect(() => {
    const uid = user?.onboardedDetails?._id;
    if (!uid) return;

    if (socket) {
      try {
        // Join personal room and request initial count
        socket.emit("join-user-room", uid);
        socket.emit("request-unread-count", uid);
      } catch (_) {}

      const onUnreadCount = (payload) => {
        if (payload && typeof payload.count === "number") {
          setUnreadSenders(payload.count);
        }
      };

      socket.on("message:unreadCount", onUnreadCount);

      return () => {
        socket.off("message:unreadCount", onUnreadCount);
      };
    }
  }, [socket, user?.onboardedDetails?._id]);

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
        className={`fixed lg:sticky h-screen lg:min-h-full top-0 inset-y-0 left-0 max-w-[calc(100vw_-_150px)] transform
    ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
    lg:translate-x-0 right-0
    transition-transform duration-300 ease-in-out
    z-[9999] lg:z-[70]
    max-sm:w-full md:w-64
    bg-white border-r border-gray-200 flex flex-col overflow-hidden`}
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
        <nav className="flex-1 px-4 py-2 mt-4 lg:mt-4 overflow-y-auto">
          <ul className="space-y-2">
            <li
              className="flex items-center justify-between p-2 hover:bg-gray-100 rounded cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push(`/sports-ambassador`);
                setTimeout(() => {
                  closeSidebar();
                }, 10);
              }}
            >
              <div className="flex items-center space-x-3">
                <FiHome className="w-6 h-6 min-w-6 max-w-6 var(--textColor)" />
                <span className="text-base leading-6 var(--textColor) font-normal">
                  {t("home")}
                </span>
              </div>
              {/* <span className="border border-[#0C0D0626] text-[#0C0D06] text-sm font-normal leading-6 rounded-full h-[21px] w-[33px] flex items-center justify-center">
                24
              </span> */}
            </li>
            {isStripeSetup && (
              <li
                className="flex items-center justify-between p-2 hover:bg-gray-100 rounded cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push("/sports-ambassador/favourites");
                  setTimeout(() => {
                    closeSidebar();
                  }, 10);
                }}
              >
                <div className="flex items-center space-x-3">
                  <FiStar className="w-6 h-6 var(--textColor)" />
                  <span className="text-base leading-6 var(--textColor) font-normal">
                    {t("saved")}
                  </span>
                </div>
              </li>
            )}
            {isStripeSetup && (
              <li
                className="flex items-center justify-between p-2 hover:bg-gray-100 rounded cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push(`/sports-ambassador/all-campaigns`);
                  setTimeout(() => {
                    closeSidebar();
                  }, 10);
                }}
              >
                <div className="flex items-center space-x-3">
                  <IconsLibrary name={"Monitor"} />
                  <span className="text-base leading-6 var(--textColor) font-normal">
                    {t("campaigns")}
                  </span>
                </div>
              </li>
            )}
            {isStripeSetup && (
              <li
                className="flex items-center justify-between p-2 hover:bg-gray-100 rounded cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push(`/sports-ambassador/campaigns`);
                  setTimeout(() => {
                    closeSidebar();
                  }, 10);
                }}
              >
                <div className="flex items-center space-x-3">
                  <IconsLibrary name={"folder"} />
                  <span className="text-base leading-6 var(--textColor) font-normal">
                    {t("my-Campaigns")}
                  </span>
                </div>
              </li>
            )}
            <li
              className="flex items-center justify-between p-2 hover:bg-gray-100 rounded cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push(`/sports-ambassador/earnings`);
                setTimeout(() => {
                  closeSidebar();
                }, 10);
              }}
            >
              <div className="flex items-center space-x-3">
                <IconsLibrary name={"earnings"} />
                <span className="text-base leading-6 var(--textColor) font-normal">
                  {t("earnings")}
                </span>
              </div>
            </li>
            {/* <li className="flex items-center justify-between p-2 hover:bg-gray-100 rounded cursor-pointer">
              <div
                className="flex items-center space-x-3"
                onClick={() => {
                  subRole == "team"
                    ? router.push(`/sports-ambassador/team-invites`)
                    : router.push(`/sports-ambassador/collaboration-invite`);
                }}
              >
                <FiUsers className="w-6 h-6 min-w-6 max-w-6 var(--textColor)" />
                <span className="text-gray-800">{t("my-team")}</span>
              </div>
            
            </li> */}

            <li
              className="flex items-center justify-between p-2 hover:bg-gray-100 rounded cursor-pointer"
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const od = user?.onboardedDetails || {};
                let slug = "";
                try {
                  slug = await resolveAmbassadorSlug(od);
                } catch (_) {
                  slug = buildAmbassadorSlug(od);
                }

                if (slug) {
                  router.push(`/ambassador/${slug}`);
                } else {
                  router.push(
                    `/sports-ambassador-profile/${subRole}/${user.id}`
                  );
                }
                setTimeout(() => {
                  closeSidebar();
                }, 10);
              }}
            >
              <div className="flex items-center space-x-3">
                <FiUser className="w-6 h-6 var(--textColor)" />
                <span className="text-base leading-6 var(--textColor) font-normal">
                  {t("profile")}
                </span>
              </div>
              {/* <span className="bg-blue-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                1
              </span> */}
            </li>
            <li
              className="flex items-center justify-between p-2 hover:bg-gray-100 rounded cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push(`/sports-ambassador/chat`);
                setTimeout(() => {
                  closeSidebar();
                }, 10);
              }}
            >
              <div className="flex items-center space-x-3">
                <div className="relative inline-flex">
                  <FiMail className="w-6 h-6 var(--textColor)" />
                  {unreadSenders > 0 && (
                    <span
                      className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center"
                      aria-label={`Unread chats: ${unreadSenders}`}
                    >
                      {unreadSenders > 99 ? "99+" : unreadSenders}
                    </span>
                  )}
                </div>
                <span className="text-base leading-6 var(--textColor) font-normal">
                  {t("inbox")}
                </span>
              </div>
            </li>
          </ul>
        </nav>
      </div>
    </>
  );
};

export default SidebarSports;
