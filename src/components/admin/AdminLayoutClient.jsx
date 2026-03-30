"use client";

import React, { useState } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayoutClient({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen((v) => !v);

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      <div className="flex-1 flex flex-col">
        <AdminHeader toggleSidebar={toggleSidebar} />
        <main className="flex-1 p-6">
          <div className="max-w-5xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
