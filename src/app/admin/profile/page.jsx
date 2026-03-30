"use client";

import AdminHeader from "@/components/admin/AdminHeader";
import AdminSidebar from "@/components/admin/AdminSidebar";
import ProfileView from "@/components/admin/ProfileView";
import { useState } from "react";

export default function ProfilePage() {
  const [profile] = useState({
    name: "John Doe",
    bio: "Web developer with a passion for creating user-friendly interfaces.",
    imageUrl: "/default-avatar.png",
  });

  return (
    <main className="flex-1 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Profile</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <ProfileView profile={profile} />
        </div>
        <div className="mt-8">
          <a
            href="/edit"
            className="text-teal-600 hover:text-teal-800 font-semibold text-lg underline"
          >
            Edit Profile
          </a>
        </div>
      </div>
    </main>
  );
}
