"use client";
import { useTranslations } from "next-intl";
import Link from "next/link";
import React from "react";

const UnauthorizedComponent = () => {
  const t = useTranslations("Unauthorized");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-800 mb-4">401</h1>
        <h2 className="text-3xl font-semibold text-gray-600 mb-6">
          {t("heading")}
        </h2>
        <p className="text-lg text-gray-500 mb-8 text-center max-w-md">
          {t("subHeading")}
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/authentication"
            className="px-6 py-3 bg-[#f26915] text-white font-medium rounded-lg hover:bg-[#e55a0c] transition-colors duration-300"
          >
            {t("loginButton")}
          </Link>
          <Link
            href="/"
            className="px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors duration-300"
          >
            {t("homeButton")}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedComponent;
