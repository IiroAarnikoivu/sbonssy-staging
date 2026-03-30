"use client";

import { HiPhotograph } from "react-icons/hi";

export default function ProfileView({ profile }) {
  return (
    <div className="card">
      <div className="flex flex-col items-center mb-6">
        <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
          <img
            src={profile?.imageUrl}
            alt="Profile"
            className="w-full h-full object-cover"
          />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mt-4">
          {profile?.name}
        </h2>
        <p className="text-gray-600 mt-2">{profile?.bio}</p>
      </div>
    </div>
  );
}
