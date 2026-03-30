"use client";

import { useFormik } from "formik";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import * as Yup from "yup";
import { LuEye, LuEyeOff } from "react-icons/lu";
import Swal from "sweetalert2";
import createClient from "@/lib/supabase/client";
import { useAuthStore } from "@/store/authStore";
import { useTranslations } from "next-intl";
import api from "@/lib/axios";

const validationSchema = Yup.object({
  email: Yup.string().email("Invalid email address").required("Required"),
  newPassword: Yup.string()
    .min(6, "Password must be at least 6 characters")
    .required("Required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("newPassword"), null], "Passwords must match")
    .required("Required"),
});

export default function ResetPasswordConfirm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuthStore();
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const t = useTranslations("Invite");
  const toastAlert = useTranslations("Sweetalert");
  const emailFromParams = searchParams.get("email") || "";

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      email: emailFromParams,
      newPassword: "",
      confirmPassword: "",
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setError("");
        // const supabase = await createClient();

        // // Standard password reset flow
        // const { data, error: supabaseError } = await supabase.auth.updateUser({
        //   password: values.newPassword,
        // });
        const resp = await api.post("/update-password", values);

        // if (supabaseError) {
        //   throw new Error(supabaseError.message || "Failed to reset password");
        // }
        if (resp) {
          setSuccessMessage(
            "Password updated successfully! Redirecting to login..."
          );

          Swal.fire({
            toast: true,
            position: "top-right",
            title: toastAlert("passwordUpdateSuccess"),
            icon: "success",
            showConfirmButton: false,
            timer: 3000,
          });

          setTimeout(() => {
            router.push("/authentication?tab=login");
          }, 3000);
        }
      } catch (error) {
        setError(error.message || "Failed to process request");
        Swal.fire({
          toast: true,
          position: "top-right",
          title: toastAlert("requestErrorText"),
          icon: "error",
          showConfirmButton: false,
          timer: 3000,
        });
      }
    },
  });

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
        <form onSubmit={formik.handleSubmit}>
          <div className="text-center mb-6">
            <h2 className="text-3xl lg:text-4xl mb-4">{t("reset")}</h2>
            <p className="text-lg">{t("para2")}</p>
          </div>

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          {successMessage && (
            <p className="text-green-500 text-sm mb-4">{successMessage}</p>
          )}

          <div>
            <label htmlFor="email" className="block mb-2">
              {t("email")}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Enter Email"
              value={formik.values.email}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="w-full border border-gray-300 rounded px-3 py-2"
              disabled={!!emailFromParams}
            />
            {formik.touched.email && formik.errors.email && (
              <p className="text-red-500 text-sm">{formik.errors.email}</p>
            )}
          </div>

          <div className="mt-6">
            <label htmlFor="newPassword" className="block mb-2">
              {t("new")}
            </label>
            <div className="relative">
              <input
                id="newPassword"
                name="newPassword"
                type={showNewPassword ? "text" : "password"}
                placeholder="Enter New Password"
                value={formik.values.newPassword}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                aria-label={showNewPassword ? "Hide password" : "Show password"}
              >
                {showNewPassword ? <LuEyeOff size={20} /> : <LuEye size={20} />}
              </button>
            </div>
            {formik.touched.newPassword && formik.errors.newPassword && (
              <p className="text-red-500 text-sm">
                {formik.errors.newPassword}
              </p>
            )}
          </div>

          <div className="mt-6">
            <label htmlFor="confirmPassword" className="block mb-2">
              {t("confirm")}
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm New Password"
                value={formik.values.confirmPassword}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
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
            {formik.touched.confirmPassword &&
              formik.errors.confirmPassword && (
                <p className="text-red-500 text-sm">
                  {formik.errors.confirmPassword}
                </p>
              )}
          </div>

          <button
            type="submit"
            disabled={formik.isSubmitting}
            className="w-full bg-orange-500 text-white rounded-full py-2 mt-6 hover:bg-orange-600 disabled:bg-orange-300"
          >
            {t("reset")}
          </button>

          <p className="text-center mt-4">
            <a
              href="/authentication"
              className="text-orange-500 hover:underline"
            >
              {t("back")}
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
