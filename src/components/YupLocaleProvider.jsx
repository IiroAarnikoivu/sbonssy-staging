"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { configureYupLocale } from "@/lib/yupLocales";

export default function YupLocaleProvider() {
  const locale = useLocale();

  useEffect(() => {
    configureYupLocale(locale);
  }, [locale]);

  return null; // No UI, just side-effect to configure Yup
}
