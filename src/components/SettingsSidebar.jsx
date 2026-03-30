"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const SettingsSidebar = ({ role }) => {
  const pathname = usePathname();
  const t = useTranslations("Settings.sidebar");

  const navItems =
    role === "fan"
      ? [{ href: `/fan/settings/general`, label: t("label1") }]
      : [
          { href: `/${role}/settings/general`, label: t("label1") },
          // { href: `/${role}/settings/notifications`, label: t("label2") },
          { href: `/${role}/settings/account`, label: t("label3") },
          { href: `/${role}/settings/payments`, label: t("label4") },
          ...(role === "brand" ? [{ href: `/brand/settings/webhooks`, label: "Webhooks" }] : []),
        ];

  return (
    <div className="px-2 pt-8 pb-2 md:pt-12 lg:py-6 md:w-1/5 md:p-6 md:pt-12 border-b md:border-b-0 md:border-r h-fit border-gray-200 md:h-screen md:sticky md:top-0 bg-white">
      <h2 className="text-lg font-semibold mb-6 text-gray-900 pt-2">
        {t("heading")}
      </h2>
      <ul className="md:space-y-4 flex gap-3 h-fit md:h-auto md:block overflow-x-auto w-full pb-2">
        <style jsx>{`
          ul::-webkit-scrollbar {
            height: 4px;
          }
          ul::-webkit-scrollbar-thumb {
            background: #cbd5e0;
            border-radius: 4px;
          }
        `}</style>
        {navItems.map((item) => {
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`block text-gray-600 hover:text-gray-900 px-3 py-2 md:px-4 rounded-md 
                  ${pathname === item.href ? "bg-gray-100 text-gray-900" : ""}`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default SettingsSidebar;
