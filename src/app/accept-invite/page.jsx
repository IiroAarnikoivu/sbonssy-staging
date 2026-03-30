"use client";

import { useFormik } from "formik";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { LuEye, LuEyeOff } from "react-icons/lu";
import Swal from "sweetalert2";
import * as Yup from "yup";

const validationSchema = Yup.object({
  email: Yup.string().email("Invalid email address").required("Required"),
  password: Yup.string()
    .min(6, "Password must be at least 6 characters")
    .required("Required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password"), null], "Passwords must match")
    .required("Required"),
});

export default function AcceptInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const inviteToken = searchParams.get("token");
  const email = searchParams.get("email") || "";
  const t = useTranslations("Invite");
  const toastAlert = useTranslations("Sweetalert");
  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      email,
      password: "",
      confirmPassword: "",
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setLoading(true);
        setError("");

        if (!inviteToken) {
          throw new Error("Invalid invitation link");
        }

        const response = await fetch("/api/auth/register/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: values.email,
            password: values.password,
            inviteToken,
          }),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Failed to accept invitation");
        }

        Swal.fire({
          toast: true,
          position: "top-right",
          title: toastAlert("accountCreated"),
          icon: "success",
          showConfirmButton: false,
          timer: 3000,
        });

        // Redirect to login after delay
        setTimeout(() => {
          router.push("/authentication?tab=login");
        }, 3000);
      } catch (error) {
        setError(error.message);
        Swal.fire({
          toast: true,
          position: "top-right",
          title: toastAlert("alreadyRegistered"),
          icon: "error",
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        setLoading(false);
      }
    },
  });

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
        <form onSubmit={formik.handleSubmit}>
          <div className="text-center mb-6">
            <h2 className="text-3xl lg:text-4xl mb-4"> {t("accept")}</h2>
            <p className="text-lg">{t("para")}</p>
          </div>

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          <div className="mb-4">
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
              disabled={!!email}
            />
            {formik.touched.email && formik.errors.email && (
              <p className="text-red-500 text-sm">{formik.errors.email}</p>
            )}
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="block mb-2">
              {t("password")}
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter Password"
                value={formik.values.password}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <LuEyeOff size={20} /> : <LuEye size={20} />}
              </button>
            </div>
            {formik.touched.password && formik.errors.password && (
              <p className="text-red-500 text-sm">{formik.errors.password}</p>
            )}
          </div>

          <div className="mb-6">
            <label htmlFor="confirmPassword" className="block mb-2">
              {t("confirm")}
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm Password"
                value={formik.values.confirmPassword}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
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
            disabled={loading}
            className="w-full bg-orange-500 text-white rounded-full py-2 hover:bg-orange-600 disabled:bg-orange-300"
          >
            {loading ? t("process") : t("accept")}
          </button>

          {/* <p className="text-center mt-4">
            <a
              href="/authentication"
              className="text-orange-500 hover:underline"
            >
              Back to Login
            </a>
          </p> */}
        </form>
      </div>
    </div>
  );
}
