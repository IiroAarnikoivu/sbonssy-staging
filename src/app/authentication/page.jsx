"use client";

import DefaultLayout from "@/components/Common/DefaultLayout.jsx/DefaultLayout";
import UserLogin from "@/components/LoginPage/LoginPage";
import { useEffect, useState } from "react";
import Image from "next/image";
import RegisterPage from "@/components/RegisterPage/RegisterPage";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import api from "@/lib/axios";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState("singUpTab");
  const [verificationMessage, setVerificationMessage] = useState("");
  const router = useRouter();
  const t = useTranslations("Authentication");
  const tabActiveHandle = (value) => {
    setActiveTab(value);
  };
  const searchParams = useSearchParams(); // Get search params
  const code = searchParams.get("code"); // Extract the 'code' parameter
  const tab = searchParams.get("tab"); // Extract the 'tab' parameter

  const getUserData = async () => {
    if (!code) return;
    try {
      const response = await api.get("/get-user-by-code?code=" + code);
      if (response.data?.message) {
        setVerificationMessage(t("emailVerified"));
      }
    } catch (error) {}
  };

  // Call inside useEffect
  useEffect(() => {
    getUserData();
  }, [code]);

  // Handle tab parameter from URL - read it once then remove it
  useEffect(() => {
    if (tab) {
      if (tab === "login") {
        setActiveTab("loginTab");
      } else if (tab === "signup") {
        setActiveTab("singUpTab");
      }
      // Remove tab parameter after reading it
      const params = new URLSearchParams(searchParams.toString());
      params.delete('tab');
      const newUrl = params.toString() ? `/authentication?${params.toString()}` : '/authentication';
      router.replace(newUrl, { scroll: false });
    }
  }, [tab]);

  return (
    <div>
      {/* logo header */}
      <DefaultLayout>
        <div className="sticky top-0 start-0 bg-white py-4">
          <div className="cursor-pointer" onClick={() => router.push("/")}>
            <Image
              alt="Logo"
              src="/assets/logo/logoMobile.png"
              width={54}
              height={54}
              className="block lg:hidden"
            />
            <Image
              alt="Logo"
              src="/assets/logo/logoDesktop.png"
              width={152}
              height={43}
              className="hidden lg:block invert-100"
            />
          </div>
        </div>
      </DefaultLayout>

      <div className="authenticationScreenHeight">
        <div className="lg:w-[480px] mx-auto px-5 lg:px-0">
          {/* tab menu */}
          <div className="w-full flex items-center">
            <button
              className={`${
                activeTab === "singUpTab"
                  ? "border-[#F26915]"
                  : "border-transparent"
              } w-full border-b transition-all duration-400 flex-1 text-center h-[49px]`}
              onClick={() => tabActiveHandle("singUpTab")}
            >
              {t("signUp")}
            </button>
            <button
              className={`${
                activeTab === "loginTab"
                  ? "border-[#F26915]"
                  : "border-transparent"
              } w-full border-b transition-all duration-400 flex-1 text-center h-[49px]`}
              onClick={() => tabActiveHandle("loginTab")}
            >
              {t("login")}
            </button>
          </div>

          {/* tab end here */}

          {/* Verification success message */}
          {verificationMessage && (
            <div className="w-full mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
              {verificationMessage}
            </div>
          )}

          <div
            className={`w-full mt-8 lg:mt-12 formInputs ${
              activeTab === "loginTab" ? "block" : "hidden"
            }`}
          >
            <UserLogin onSwitchToSignUp={() => tabActiveHandle("singUpTab")} />
          </div>

          <div
            className={`w-full mt-8 lg:mt-12 formInputs ${
              activeTab === "singUpTab" ? "block" : "hidden"
            }`}
          >
            <RegisterPage onSwitchToLogin={() => tabActiveHandle("loginTab")} />
          </div>
        </div>
      </div>
    </div>
  );
}
