"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function AccountCreatedPage() {
  const t = useTranslations("Sweetalert");
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5">
      <div className="text-center max-w-md">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Image
            alt="Logo"
            src="/assets/logo/logoDesktop.png"
            width={152}
            height={43}
            className="invert-100"
          />
        </div>

        {/* Success Icon */}
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        {/* Message */}
        <h1 className="text-3xl lg:text-4xl font-semibold mb-4">
          {t("accountCreated")}
        </h1>
        <h2 className="text-3xl lg:text-4xl font-semibold mb-4">
          {t("accountCreatedheading")}
        </h2>

        {/* Back to Login Button */}
        <button
          onClick={() => router.push("/authentication?tab=login")}
          className="primaryBtn w-full mt-8"
        >
          {t("backLogin")}
        </button>
      </div>
    </div>
  );
}
