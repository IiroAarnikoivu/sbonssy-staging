"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import React, { useEffect, useState, useRef } from "react";

export default function LanguageSwitcher({
  className,
  textWhite,
  btnStyle,
  lineColor,
  onLanguageSelected,
}) {
  const router = useRouter();
  const currentLocale = useLocale();
  const [locale, setLocale] = useState(currentLocale);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const savedLocale = localStorage.getItem("locale") || "en";
    if (savedLocale !== locale) {
      setLocale(savedLocale);
      document.cookie = `locale=${savedLocale}; path=/`;
      router.refresh();
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const switchLocale = (newLocale) => {
    localStorage.setItem("locale", newLocale);
    document.cookie = `locale=${newLocale}; path=/`;
    setLocale(newLocale);
    setIsOpen(false);
    if (typeof onLanguageSelected === "function") {
      try {
        onLanguageSelected(newLocale);
      } catch (_) {}
    }
    router.refresh();
  };

  const languages =
    locale === "fi"
      ? [
          { code: "en", name: "EN" },
          { code: "fi", name: "FI" },
        ]
      : [
          { code: "en", name: "EN" },
          { code: "fi", name: "FI" },
        ];

  const currentLanguage =
    languages.find((lang) => lang.code === locale)?.name || "English";

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className={`lg:bg-white rounded-[12px] flex items-center ${className}`}
        role="menu"
        aria-orientation="vertical"
      >
        {languages.map((language, index) => (
          <React.Fragment key={index}>
            <button
              key={language.code}
              className={`text-base h-fit pe-3 last:ps-3 leading-none ${
                textWhite ? "text-white" : "text-black"
              } ${btnStyle}`}
              onClick={() => switchLocale(language.code)}
              role="menuitem"
            >
              {language.name}
            </button>

            {index == 0 && (
              <span className="block h-[16px] w-[1px]   bg-white lg:bg-black " />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
