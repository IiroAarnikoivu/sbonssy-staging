import { getTranslations } from "next-intl/server";
import Link from "next/link";
import React from "react";

const NotFoundComponent = async () => {
  const t = await getTranslations("NotFound");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
      <h2 className="text-3xl font-semibold text-gray-600 mb-6">
        {t("heading")}
      </h2>
      <p className="text-lg text-gray-500 mb-8 text-center max-w-md">
        {t("subHeading")}
      </p>
      <Link
        href="/"
        className="px-6 py-3 bg-[#f26915] text-white font-medium rounded-lg hover:bg-[#f26915] transition-colors duration-300"
      >
        {t("url")}
      </Link>
    </div>
  );
};

export default NotFoundComponent;
