"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import { LuEye, LuEyeOff } from "react-icons/lu";
import Swal from "sweetalert2";
import { useTranslations, useLocale } from "next-intl";
import { configureYupLocale } from "@/lib/yupLocales";

export default function ResetPassword() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const toastAlert = useTranslations("Sweetalert");
  const t = useTranslations("ResetPassword");
  const locale = useLocale();

  // Configure Yup locale and memoize schema for translated messages
  const normLocale =
    (typeof locale === "string" && locale.split("-")?.[0]) || locale;
  configureYupLocale(normLocale);
  const validationSchema = useMemo(
    () =>
      Yup.object({
        password: Yup.string().min(6).required().label(t("newPassword")),
        confirmPassword: Yup.string()
          .oneOf([Yup.ref("password"), null])
          .required()
          .label(t("confirmPassword")),
      }),
    [normLocale, t]
  );

  const handleSubmit = async (values) => {
    try {
      setIsSubmitting(true);
      setError("");
      setSuccess("");

      const code = searchParams.get("code");
      if (!code) {
        throw new Error("Invalid reset link - missing verification code");
      }

      const response = await fetch("/api/update-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          newPassword: values.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update password");
      }

      setSuccess("Password updated successfully! Redirecting to login...");
      Swal.fire({
        toast: true,
        position: "top-right",
        title: toastAlert("passwordUpdateSuccess"),
        icon: "success",
        showConfirmButton: false,
        timer: 3000,
      });

      const origin = searchParams.get("origin");
      setTimeout(() => {
        if (origin === "admin") {
          router.push("/admin");
        } else {
          router.push("/authentication?tab=login");
        }
      }, 3000);

      // Clear the URL of the code parameter for security
      // window.history.replaceState({}, document.title, window.location.pathname);

      // setTimeout(() => {
      //   router.push("/authentication");
      // }, 3000);
    } catch (err) {
      setError(err.message || "Failed to reset password");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formik = useFormik({
    initialValues: {
      password: "",
      confirmPassword: "",
    },
    validationSchema,
    onSubmit: handleSubmit,
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form
        onSubmit={formik.handleSubmit}
        className="space-y-4 w-full max-w-md p-8 bg-white rounded-lg shadow-md"
      >
        <h2 className="text-2xl font-bold text-center">{t("heading")}</h2>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-md">{error}</div>
        )}

        {success && (
          <div className="p-3 bg-green-50 text-green-700 rounded-md">
            {success}
          </div>
        )}

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t("newPassword")}
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder={t("subHeading")}
              value={formik.values.password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <LuEyeOff size={20} /> : <LuEye size={20} />}
            </button>
          </div>
          {formik.touched.password && formik.errors.password && (
            <p className="mt-1 text-sm text-red-600">
              {formik.errors.password}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t("confirmPassword")}
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder={t("placeholder")}
              value={formik.values.confirmPassword}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              aria-label={
                showConfirmPassword ? "Hide password" : "Show password"
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
            <p className="mt-1 text-sm text-red-600">
              {formik.errors.confirmPassword}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-4 py-2 bg-[#F26915] text-white rounded-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? t("updating") : t("update")}
        </button>

        <p className="text-center text-sm text-gray-600">
          {t("remember")}{" "}
          <a href="/authentication" className="font-medium text-[#F26915] ">
            {t("login")}
          </a>
        </p>
      </form>
    </div>
  );
}
