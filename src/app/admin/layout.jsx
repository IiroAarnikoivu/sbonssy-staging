"use client";

import AdminHeader from "@/components/admin/AdminHeader";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { useState } from "react";

export default function RootLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      <div className="flex-1 flex flex-col min-h-0">
        <AdminHeader toggleSidebar={toggleSidebar} />
        <main className="flex-1 min-h-0 p-6 flex">
          <div className="w-full max-w-7xl mx-auto flex-1 min-h-0 flex flex-col">
            {children}
          </div>
        </main>
        <div className="py-4 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} Sbonssy
        </div>
      </div>
    </div>
  );
}
