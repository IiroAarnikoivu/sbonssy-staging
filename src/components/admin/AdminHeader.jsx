"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { HiMenu } from "react-icons/hi";
import api from "@/lib/axios";
import { useAuthStoreWithTranslations } from "@/store/authStoreHelpers";
import LanguageSwitcher from "../Common/LanguageSwitcher/LanguageSwitcher";
import { useTranslations } from "next-intl";

/**
 * AdminHeader component renders the top navigation bar of the admin dashboard.
 * Includes sidebar toggle, language switcher, admin info, and a dropdown for profile/logout.
 *
 * @component
 * @param {Object} props - Component props
 * @param {Function} props.toggleSidebar - Function to toggle the sidebar visibility
 * @returns {JSX.Element} The rendered AdminHeader component
 */
export default function AdminHeader({ toggleSidebar }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [user, setUser] = useState();
  const { logout } = useAuthStoreWithTranslations();
  const router = useRouter();
  const menuRef = useRef(null);
  const t = useTranslations("Admin.header");

  /**
   * Handle closing the dropdown modal when clicking outside of it
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsModalOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /**
   * Toggle visibility of the dropdown menu
   */
  const toggleModal = () => setIsModalOpen((prev) => !prev);

  /**
   * Handle logout action and redirect to authentication page
   */
  const handleLogout = async () => {
    try {
      const resp = await logout();
      setIsModalOpen(false);
      if (resp) router.push("/authentication");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  /**
   * Fetch the admin's profile info on mount
   */
  useEffect(() => {
    (async () => {
      try {
        const resp = await api.get("/admin/admin-profile");
        if (resp) setUser(resp.data);
      } catch (error) {
        console.error("Failed to fetch admin profile:", error);
      }
    })();
  }, []);

  return (
    <header className="bg-white shadow-md p-4 flex justify-between items-center relative">
      <div className="flex items-center">
        {/* Sidebar toggle button (visible on small screens) */}
        <button
          onClick={toggleSidebar}
          className="md:hidden mr-4 text-gray-600 hover:text-gray-900"
        >
          <HiMenu className="w-6 h-6" />
        </button>

        {/* Dashboard title */}
        <h1 className="text-xl font-semibold text-gray-800">
          {t("dashboard")}
        </h1>
      </div>

      <div className="flex items-center space-x-4">
        {/* Language selector */}
        <LanguageSwitcher />

        {/* Admin name */}
        <span className="text-gray-600">{user?.admin?.name}</span>

        {/* Admin avatar with initial (used to toggle dropdown) */}
        <button
          onClick={toggleModal}
          className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white focus:outline-none"
          aria-label="Toggle user menu"
        >
          {user?.admin?.name?.[0]?.toUpperCase()}
        </button>
      </div>

      {/* Profile/Logout dropdown menu */}
      {isModalOpen && (
        <div
          ref={menuRef}
          className="absolute top-16 right-4 bg-white shadow-lg rounded-md p-2 w-32 z-10"
        >
          {/* Navigate to profile page */}
          <button
            onClick={() => {
              router.push("/admin/admin-profile");
              setIsModalOpen(false);
            }}
            className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
          >
            {t("profile")}
          </button>

          {/* Trigger logout */}
          <button
            onClick={handleLogout}
            className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
          >
            {t("logout")}
          </button>
        </div>
      )}
    </header>
  );
}
