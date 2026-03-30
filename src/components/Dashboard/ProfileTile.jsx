"use client";

import { useTranslations } from "next-intl";

export default function ProfileTile({ role, welcomeText }) {
  const t = useTranslations("Dashboard");
  return (
    <div
      className={`${
        role === "sports-ambassador" ? "bg-[#C6C6C6] text-black" : "bg-reddishPurple text-white"
      } md:h-full flex justify-center max-w-[300px] h-[300px] mx-auto w-full items-center flex-col p-8 rounded-2xl`}
    >
      <h1 className="text-2xl font-bold mb-1">{t("heading")}</h1>
      <div className="w-full h-[2px] bg-white opacity-30 my-5" />
      <p>{welcomeText}</p>
    </div>
  );
}
