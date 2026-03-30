"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";
import { LuEye, LuEyeOff } from "react-icons/lu";
import IconsLibrary from "@/util/IconsLibrary";
import Swal from "sweetalert2";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { configureYupLocale } from "@/lib/yupLocales";
import Modal from "@/components/Common/Modal";
import TermsContent from "@/components/Legal/TermsContent";
import PrivacyContent from "@/components/Legal/PrivacyContent";

// Yup validation schema for registration form

/**
 * Component for user registration using email/password or Google OAuth.
 * Redirects user based on role after successful registration.
 */
export default function RegisterPage({ onSwitchToLogin }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuthStore();
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  // Get query params
  const roleParam = searchParams.get("role");

  const t = useTranslations("Authentication");
  const toastAlert = useTranslations("Sweetalert");
  const v = useTranslations("Validation");
  const locale = useLocale();

  // Configure Yup locale before building schema
  configureYupLocale(locale);

  // If your file still uses per-field messages, ensure they come from Validation namespace
  const validationSchema = useMemo(
    () =>
      Yup.object({
        email: Yup.string()
          .email(v("emailRequired"))
          .required(v("emailRequired")),
        password: Yup.string()
          .min(6, v("passwordMin"))
          .required(v("passwordRequired")),
        confirmPassword: Yup.string()
          .oneOf([Yup.ref("password"), null], v("confirmPasswordMatch"))
          .required(v("confirmPasswordRequired")),
        terms: Yup.boolean()
          .required(v("termsRequired"))
          .oneOf([true], v("termsRequired")),
        age: Yup.boolean().when("role", {
          is: (role) => role === "sports-ambassador",
          then: () =>
            Yup.boolean()
              .required(v("ageRequired"))
              .oneOf([true], v("ageRequired")),
          otherwise: () => Yup.boolean().notRequired(),
        }),
        role: Yup.string().required(v("roleRequired")),
      }),
    [locale, v]
  );

  // Set initial role based on query param
  useEffect(() => {
    if (
      roleParam &&
      ["fan", "sports-ambassador", "brand"].includes(roleParam)
    ) {
      setSelected(roleParam);
      formik.setFieldValue("role", roleParam);
    }
  }, [roleParam]);

  const formik = useFormik({
    initialValues: {
      email: "",
      password: "",
      confirmPassword: "",
      role: selected,
      terms: false,
      age: false,
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setError("");
        // Register with email/password via backend API
        const response = await api.post("/auth/register", {
          email: values.email,
          password: values.password,
          role: values.role,
        });
        if (response) {
          // Store email + role in sessionStorage so they don't appear in the URL
          sessionStorage.setItem("otp_email", values.email);
          sessionStorage.setItem("otp_role", values.role);
          router.push("/verify-otp");
        }
      } catch (error) {
       
        const isRateLimit = error?.error?.status === 429 || error?.error?.code === "over_email_send_rate_limit";
        
        Swal.fire({
          toast: true,
          position: "top-right",
          title: isRateLimit ? toastAlert("serverError") : toastAlert("alreadyRegistered"),
          icon: "error",
          showConfirmButton: false,
          timerProgressBar: false,
          timer: 5000,
        });
      }
    },
  });

  const tabs = [
    { id: "sports-ambassador", label: t("sports") },
    { id: "brand", label: t("brand") },
    { id: "fan", label: t("fan") },
  ];

  /**
   * Handles tab change and removes query params
   */
  const handleTabChange = (tabId) => {
    setSelected(tabId);
    formik.setFieldValue("role", tabId);
    // Remove all query parameters
    router.replace("/authentication");
  };

  /**
   * Handles Google OAuth registration.
   * Redirects user to Google OAuth URL.
   */

  return (
    <div className="">
      {/* select Role Tab menu */}
      <form onSubmit={formik.handleSubmit} className="formInputs">
        <div className="text-center mb-[29px] lg:mb-[23px]">
          <h2 className="text-[36px] lg:text-[48px] mb-5 lg:mb-6">
            {t("signUp")}
          </h2>
          <p className="text-lg">{t("heading")} </p>
        </div>

        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
        {!selected && (
          <p className="text-sm text-gray-600 mb-3 text-center">
            {t("selectAccountType") || "Please select your account type to continue"}
          </p>
        )}
        <div className="md:flex md:border-b border-black w-full md:w-fit mb-[22px] ">
          {tabs.map((tab) => (
            <label
              key={tab.id}
              className={`h-10 flex justify-center items-center cursor-pointer w-full md:w-[160px] text-center transition-all font-medium text-base
            ${selected === tab.id
                  ? "bg-black outline-2 z-10 outline-[#0C0D06] text-white shadow-tabCustom"
                  : "bg-gray-100 text-black"
                }`}
            >
              <input
                type="radio"
                name="role"
                value={tab.id}
                checked={selected === tab.id}
                onChange={() => handleTabChange(tab.id)}
                className="hidden"
              />
              {tab.label}
            </label>
          ))}
        </div>

        <div>
          <label htmlFor="email" className="block mb-2">
            {t("email")}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder={t("placeholderEmail")}
            value={formik.values.email}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            disabled={!selected}
            className="mt-0 w-full border border-gray-300 rounded px-3 py-2 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          {formik.touched.email && formik.errors.email && (
            <p className="text-red-500 text-sm">{formik.errors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block mb-2 mt-6">
            {t("password")}
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder={t("placeholderPassword")}
              value={formik.values.password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              disabled={!selected}
              className="w-full border border-gray-300 rounded px-3 py-2 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              aria-label={showPassword ? v("hidePassword") : v("showPassword")}
            >
              {showPassword ? <LuEyeOff size={20} /> : <LuEye size={20} />}
            </button>
          </div>
          {formik.touched.password && formik.errors.password && (
            <p className="text-red-500 text-sm">{formik.errors.password}</p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block mb-2 mt-6">
            {t("confirm")}
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder={t("placeholderConfirmPassword")}
              value={formik.values.confirmPassword}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              disabled={!selected}
              className="w-full border border-gray-300 rounded px-3 py-2 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              aria-label={
                showConfirmPassword ? v("hidePassword") : v("showPassword")
              }
            >
              {showConfirmPassword ? (
                <LuEyeOff size={20} />
              ) : (
                <LuEye size={20} />
              )}
            </button>
          </div>
          {formik.touched.confirmPassword && formik.errors.confirmPassword && (
            <p className="text-red-500 text-sm">
              {formik.errors.confirmPassword}
            </p>
          )}
        </div>
        <div className="mt-2.5 flex gap-2">
          <label className="checkbox-wrapper flex items-center">
            <input
              type="checkbox"
              id="terms"
              name="terms"
              checked={formik.values.terms}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            <span className="custom-checkbox"></span>
          </label>
          <label htmlFor="terms" className="text-sm">
            {t("terms")}
            <button
              type="button"
              onClick={() => setShowTerms(true)}
              className="text-blue-600 hover:underline mx-1"
            >
              {t("service")}
            </button>
            {t("and")}
            <button
              type="button"
              onClick={() => setShowPrivacy(true)}
              className="text-blue-600 hover:underline ml-1"
            >
              {t("policy")}
            </button>
          </label>
        </div>
        {formik.touched.terms && formik.errors.terms && (
          <p className="text-red-500 text-sm">{formik.errors.terms}</p>
        )}

        {selected === "sports-ambassador" && (
          <div className="mt-2.5 flex gap-2">
            <label className="checkbox-wrapper flex items-center">
              <input
                type="checkbox"
                id="age"
                name="age"
                checked={formik.values.age}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
              <span className="custom-checkbox"></span>
            </label>
            <label htmlFor="age" className="text-sm m-0 p-0">
              {t("age")}
            </label>
          </div>
        )}

        {formik.touched.age && formik.errors.age && (
          <p className="text-red-500 text-sm">{formik.errors.age}</p>
        )}
        <button type="submit" disabled={!selected || formik.isSubmitting} className="w-full primaryBtn mt-6 disabled:opacity-50 disabled:cursor-not-allowed">
          {formik.isSubmitting ? t("registering") : t("register")}
        </button>
        <a
          href={selected ? `/api/auth/google/register?role=${selected}` : undefined}
          onClick={!selected ? (e) => { e.preventDefault(); setError(v("pleaseSelectRole")); } : undefined}
          className={`btn w-full border-0 rounded-full py-2 mt-4 mb-1 text-textColor flex gap-2 items-center justify-center ${!selected ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <IconsLibrary name="solidGoogle" /> {t("google")}
        </a>

        <p className="text-center mt-1 mb-20">
          {t("account")}{" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-orange hover:underline"
          >
            {t("login")}
          </button>
        </p>
      </form>

      <Modal
        isOpen={showTerms}
        onClose={() => setShowTerms(false)}
        title={t("service")}
      >
        <TermsContent />
      </Modal>

      <Modal
        isOpen={showPrivacy}
        onClose={() => setShowPrivacy(false)}
        title={t("policy")}
      >
        <PrivacyContent />
      </Modal>
    </div>
  );
}
