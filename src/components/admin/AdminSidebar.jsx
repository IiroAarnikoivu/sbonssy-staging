"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  HiDesktopComputer,
  HiFlag,
  HiOutlineChartBar,
  HiOutlineChartPie,
  HiOutlineCog,
  HiOutlineCreditCard,
  HiOutlineDocumentReport,
  HiOutlineDocumentText,
  HiOutlineMail,
  HiOutlineQuestionMarkCircle,
  HiOutlineSpeakerphone,
  HiOutlineTag,
  HiOutlineUsers,
  HiX,
} from "react-icons/hi";

export default function AdminSidebar({ sidebarOpen, toggleSidebar }) {
  const t = useTranslations("Admin.sidebar");
  return (
    <aside
      className={`admin-sidebar h-screen fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-gray-900 to-gray-800 text-white transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      } md:sticky md:top-0 md:h-screen md:translate-x-0 md:flex md:flex-col`}
    >
      <div className="flex items-center justify-between p-6 border-b border-gray-700">
        <h2 className="text-2xl font-bold text-teal-400">{t("heading")}</h2>
        <button
          onClick={toggleSidebar}
          className="md:hidden text-gray-300 hover:text-white"
        >
          <HiX className="w-6 h-6" />
        </button>
      </div>
      <nav className="scroll-area flex-1 p-6 pb-8 overflow-y-auto min-h-0">
        <ul className="space-y-4">
          <li>
            <Link
              href="/admin"
              className="flex items-center p-2 text-gray-300 hover:bg-teal-600 rounded-lg hover:text-white"
            >
              <HiOutlineChartBar className="w-5 h-5 mr-3" /> {t("dashboard")}
            </Link>
          </li>
          <li>
            <Link
              href="/admin/users"
              className="flex items-center p-2 text-gray-300 hover:bg-teal-600 rounded-lg hover:text-white"
            >
              <HiOutlineUsers className="w-5 h-5 mr-3" /> {t("users")}
            </Link>
          </li>
          <li>
            <Link
              href="/admin/campaigns"
              className="flex items-center p-2 text-gray-300 hover:bg-teal-600 rounded-lg hover:text-white"
            >
              <HiOutlineSpeakerphone className="w-5 h-5 mr-3" /> {t("campaign")}
            </Link>
          </li>
          <li>
            <Link
              href="/admin/banner"
              className="flex items-center p-2 text-gray-300 hover:bg-teal-600 rounded-lg hover:text-white"
            >
              <HiFlag className="w-5 h-5 mr-3" /> {t("banner")}
            </Link>
          </li>
          <li>
            <Link
              href="/admin/blogs"
              className="flex items-center p-2 text-gray-300 hover:bg-teal-600 rounded-lg hover:text-white"
            >
              <HiOutlineDocumentText className="w-5 h-5 mr-3" /> {t("blogs")}
            </Link>
          </li>
          <li>
            <Link
              href="/admin/faqs"
              className="flex items-center p-2 text-gray-300 hover:bg-teal-600 rounded-lg hover:text-white"
            >
              <HiOutlineQuestionMarkCircle className="w-5 h-5 mr-3" />{" "}
              {t("faqs")}
            </Link>
          </li>
          {/* <li>
            <Link
              href="/admin/collaboration"
              className="flex items-center p-2 text-gray-300 hover:bg-teal-600 rounded-lg hover:text-white"
            >
              <HiOutlineUserGroup className="w-5 h-5 mr-3" />{" "}
              {t("collaboration")}
            </Link>
          </li> */}
          <li>
            <Link
              href="/admin/interactions"
              className="flex items-center p-2 text-gray-300 hover:bg-teal-600 rounded-lg hover:text-white"
            >
              <HiDesktopComputer className="w-5 h-5 mr-3" />{" "}
              {t("campaignInteraction")}
            </Link>
          </li>
          <li>
            <Link
              href="/admin/inquiry"
              className="flex items-center p-2 text-gray-300 hover:bg-teal-600 rounded-lg hover:text-white"
            >
              <HiOutlineMail className="w-5 h-5 mr-3" /> {t("inquiry")}
            </Link>
          </li>
          <li>
            <Link
              href="/admin/reports"
              className="flex items-center p-2 text-gray-300 hover:bg-teal-600 rounded-lg hover:text-white"
            >
              <HiOutlineDocumentReport className="w-5 h-5 mr-3" />{" "}
              {t("reports")}
            </Link>
          </li>
          <li>
            <Link
              href="/admin/tags"
              className="flex items-center p-2 text-gray-300 hover:bg-teal-600 rounded-lg hover:text-white"
            >
              <HiOutlineTag className="w-5 h-5 mr-3" /> {t("tags")}
            </Link>
          </li>
          <li>
            <Link
              href="/admin/event-details"
              className="flex items-center p-2 text-gray-300 hover:bg-teal-600 rounded-lg hover:text-white"
            >
              <HiOutlineChartPie className="w-5 h-5 mr-3" />
              {t("analytics")}
            </Link>
          </li>
          <li>
            <Link
              href="/admin/payments"
              className="flex items-center p-2 text-gray-300 hover:bg-teal-600 rounded-lg hover:text-white"
            >
              <HiOutlineCreditCard className="w-5 h-5 mr-3" /> {t("payments")}
            </Link>
          </li>
          <li>
            <Link
              href="/admin/help-center"
              className="flex items-center p-2 text-gray-300 hover:bg-teal-600 rounded-lg hover:text-white"
            >
              <HiOutlineQuestionMarkCircle className="w-5 h-5 mr-3" />{" "}
              {t("help")}
            </Link>
          </li>
          {/* <li>
            <Link
              href="/admin/csv-upload"
              className="flex items-center p-2 text-gray-300 hover:bg-teal-600 rounded-lg hover:text-white"
            >
              <HiOutlineChartPie className="w-5 h-5 mr-3" /> {t("csv")}
            </Link>
          </li>
          <li>
            <Link
              href="/admin/upload-logs"
              className="flex items-center p-2 text-gray-300 hover:bg-teal-600 rounded-lg hover:text-white"
            >
              <HiOutlineChartPie className="w-5 h-5 mr-3" /> {t("logs")}
            </Link>
          </li> */}
          <li>
            <Link
              href="/admin/settings"
              className="flex items-center p-2 text-gray-300 hover:bg-teal-600 rounded-lg hover:text-white"
            >
              <HiOutlineCog className="w-5 h-5 mr-3" /> {t("settings")}
            </Link>
          </li>
        </ul>
      </nav>
      {/* Scoped scrollbar styles for the sidebar */}
      <style jsx>{`
        .admin-sidebar {
          /* Firefox */
          scrollbar-width: thin;
          scrollbar-color: #6b7280 #111827; /* thumb track */
        }
        .admin-sidebar .scroll-area::-webkit-scrollbar {
          width: 8px;
        }
        .admin-sidebar .scroll-area::-webkit-scrollbar-track {
          background: #111827; /* gray-900 track to avoid white gap at bottom */
        }
        .admin-sidebar .scroll-area::-webkit-scrollbar-thumb {
          background-color: #6b7280; /* gray-500 */
          border-radius: 8px;
          border: 2px solid #111827; /* create spacing matching track */
        }
        .admin-sidebar .scroll-area::-webkit-scrollbar-thumb:hover {
          background-color: #9ca3af; /* gray-400 */
        }
      `}</style>
    </aside>
  );
}
