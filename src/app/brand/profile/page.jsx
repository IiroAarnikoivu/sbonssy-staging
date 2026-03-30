"use client";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import React from "react";

const Profile = () => {
  const { user } = useAuthStore();
  const router = useRouter();
  return (
    <div className="p-4 pt-8 md:p-6 md:pt-10 text-[#0C0D06]">
      <h1 className="text-5xl font-normal mb-20 leading-5">My Profile</h1>

      <div>
        <p className="text-2xl font-normal leading-6 mb-6">
          Profile Setup & Updates
        </p>

        <p className="text-lg font-normal leading-6 mb-6">
          Keep your profile up-to-date so brands and partners know exactly who
          you are.
        </p>
        <p className="text-lg font-normal leading-6 mb-2">
          These settings mirror the onboarding steps – so if you're updating,
          it’s just like setting up your account for the first time.
        </p>
        <p className="text-lg font-normal leading-6 mb-6">
          Tip: A well-completed profile helps you stand out to affiliate
          partners!
        </p>

        <div className="flex gap-[46px]">
          <button
            type="button"
            className="text-base leading-6 bg-[var(--reddishPurple)]  text-white  min-h-10 py-0 px-16 rounded-full"
          >
            Profile Settings
          </button>
          <button
            type="button"
            className="text-base leading-6 bg-[var(--reddishPurple)]  text-white  min-h-10 py-0 px-16 rounded-full"
            onClick={() => router.push(`/brand-profile/${user?.id}`)}
          >
            View Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
