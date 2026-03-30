"use client";

import { useEffect, useState } from "react";
import Loader from "@/components/Loader";
import { useTranslations } from "next-intl";
import AnimatedSection from "@/components/Common/AnimatedSection";

export default function CookiesPage() {
  const [isReady, setIsReady] = useState(false);
  const t = useTranslations("Cookies");

  // Ensure CookieHub UI is only visible on this page
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.classList.add("show-cookiehub");
    }
    return () => {
      if (typeof document !== "undefined") {
        document.body.classList.remove("show-cookiehub");
      }
    };
  }, []);

  useEffect(() => {
    const onReady = () => setIsReady(true);

    if (typeof window !== "undefined") {
      if (window.cookiehub) setIsReady(true);
      window.addEventListener("cookiehub:ready", onReady);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("cookiehub:ready", onReady);
      }
    };
  }, []);

  const openCookieSettings = () => {
    try {
      const ch = typeof window !== "undefined" ? window.cookiehub : undefined;
      if (!ch) return;
      // Try common CookieHub APIs for opening the preferences dialog
      if (typeof ch.openSettings === "function") return ch.openSettings();
      if (typeof ch.open === "function") return ch.open();
      if (typeof ch.showWidget === "function") return ch.showWidget();
    } catch {
      // ignore
    }
  };

  return (
    <main className="min-h-[60vh] py-16">
      <AnimatedSection effect="fade-up" threshold={0}>
        <div className="mx-auto w-full max-w-3xl px-4">
          <h1 className="text-3xl font-semibold mb-3 text-black">{t("heading")}</h1>
          <p className="text-base text-gray-600 mb-8">{t("para")}</p>

          <button
            type="button"
            onClick={openCookieSettings}
            className="inline-flex items-center rounded-md bg-black px-6 py-2.5 text-white hover:bg-gray-800 transition-colors font-medium shadow-sm"
          >
            {t("btn")}
          </button>

          {!isReady && (
            <div className="mt-4 text-sm text-gray-400">
              <Loader />
            </div>
          )}
        </div>
      </AnimatedSection>
    </main>
  );
}
