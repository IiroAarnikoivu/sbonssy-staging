"use client";

import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import IconsLibrary from "@/util/IconsLibrary";
import { useFormik } from "formik";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import * as Yup from "yup";
import { LuEye, LuEyeOff } from "react-icons/lu";
import Swal from "sweetalert2";
import { useTranslations, useLocale } from "next-intl";
import { configureYupLocale } from "@/lib/yupLocales";

export default function UserLogin({ onSwitchToSignUp }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const { setUser, fetchUser } = useAuthStore();
  const t = useTranslations("Authentication");
  const toastAlert = useTranslations("Sweetalert");
  const v = useTranslations("Validation");
  const locale = useLocale();

  // Ensure Yup uses the current locale (e.g., "fi") before building schemas
  configureYupLocale(locale);

  const loginValidationSchema = useMemo(
    () =>
      Yup.object({
        email: Yup.string().email().required(),
        password: Yup.string().min(6).required(),
      }),
    [locale]
  );

  const forgotPasswordValidationSchema = useMemo(
    () =>
      Yup.object({
        email: Yup.string().email().required(),
      }),
    [locale]
  );

  const formik = useFormik({
    initialValues: {
      email: "",
      password: "",
    },
    validationSchema: isForgotPassword
      ? forgotPasswordValidationSchema
      : loginValidationSchema,
    onSubmit: async (values) => {
      if (isForgotPassword) {
        await handlePasswordReset();
        return;
      }

      try {
        setError("");
        const response = await api.post("/auth/login", {
          email: values.email,
          password: values.password,
        });

        const { user } = response.data;
        if (response) {
          Swal.fire({
            toast: true,
            position: "top-right",
            title: toastAlert("loggedInSuccess"),
            icon: "success",
            showConfirmButton: false,
            timerProgressBar: false,
            timer: 5000,
          });
        }

        setUser(user);

        const fullUser = await fetchUser();

        const redirectUrl =
          user?.isProfileCompleted || user?.role === "fan"
            ? `/${user.role}`
            : `/onboarding/${user.role}`;

        router.push(redirectUrl);
      } catch (error) {
        // Our axios interceptor (src/lib/axios.js) returns error.response.data || error.message
        console.log("Login Error Payload:", error);
        
        const errorData = typeof error === "object" ? error : { message: error };
        const { message, error: errorType, emailSent, email, role } = errorData;

        let errorMessage = toastAlert("emailverification"); // Default fallback

        // Handle specific error cases
        if (errorType === "email_not_confirmed") {
          console.log("Detected unconfirmed email. Redirecting...", { email, role });
          if (email && role) {
            console.log("email", email);
            console.log("role", role);  
            sessionStorage.setItem("otp_email", email);
            sessionStorage.setItem("otp_role", role);
            router.push("/verify-otp");
            return;
          }
          errorMessage = emailSent
            ? toastAlert("emailNotConfirmedWithResend")
            : toastAlert("emailNotConfirmedCheckEmail");
        } else if (errorType === "verification_resend_failed") {
          errorMessage = toastAlert("emailNotConfirmedResendFailed");
        } else if (message) {
          // Handle common error messages
          if (message.includes("Invalid login credentials")) {
            errorMessage = toastAlert("invalidCredentials");
          } else if (message.includes("User not found")) {
            errorMessage = toastAlert("userNotFoundSignUp");
          } else if (message.includes("Invalid credentials")) {
            errorMessage = toastAlert("invalidCredentials");
          } else if (message.includes("Invalid invitation status")) {
            errorMessage = toastAlert("invalidInvitationStatus");
          } else if (message.includes("Inviter not found")) {
            errorMessage = toastAlert("inviterNotFound");
          } else {
            errorMessage = message;
          }
        } else if (
          error.code === "NETWORK_ERROR" ||
          (typeof error === "string" && error.includes("Network Error"))
        ) {
          errorMessage = toastAlert("networkError");
        } else if (typeof error === "string") {
          errorMessage = error;
        }

        Swal.fire({
          toast: true,
          position: "top-right",
          title: errorMessage,
          icon: "error",
          showConfirmButton: false,
          timerProgressBar: false,
          timer: 5000,
        });
      }
    },
  });

  const handleGoogleLogin = async () => {
    try {
      setError("");
      // Redirect directly to the existing OAuth initiator route.
      // No role is needed for login; callback will resolve role from metadata.
      window.location.href = "/api/auth/google/register";
    } catch (error) {
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        toastAlert("googleLoginFailed");

      setError(errorMessage);

      Swal.fire({
        toast: true,
        position: "top-right",
        title: errorMessage,
        icon: "error",
        showConfirmButton: false,
        timer: 5000,
      });
    }
  };
  const handlePasswordReset = async () => {
    try {
      setError("");
      const response = await api.post("/auth/reset-password", {
        email: formik.values.email,
      });

      Swal.fire({
        toast: true,
        position: "top-right",
        title: toastAlert("passwordResetEmailSent"),
        icon: "success",
        showConfirmButton: false,
        timer: 5000,
      });

      setIsForgotPassword(false);
    } catch (error) {
      // Handle specific error messages for password reset
      let errorMessage = toastAlert("resetError"); // Default fallback

      if (error.response?.data?.message) {
        if (error.response.data.message.includes("User not found")) {
          errorMessage = toastAlert("userNotFoundPasswordReset");
        } else {
          errorMessage = error.response.data.message;
        }
      } else if (
        error.code === "NETWORK_ERROR" ||
        error.message?.includes("Network Error")
      ) {
        errorMessage = toastAlert("networkError");
      }

      Swal.fire({
        toast: true,
        position: "top-right",
        title: errorMessage,
        icon: "error",
        showConfirmButton: false,
        timer: 5000,
      });
    }
  };

  const toggleForgotPassword = () => {
    setIsForgotPassword(!isForgotPassword);
    setError("");
    setResetMessage("");
  };

  return (
    <>
      <form onSubmit={formik.handleSubmit}>
        <div className="text-center mb-[29px] lg:mb-[23px]">
          <h2 className="text-[36px] lg:text-[48px] mb-5 lg:mb-6">
            {isForgotPassword ? t("reset") : t("login")}
          </h2>
          <p className="text-lg">
            {isForgotPassword ? t("forgotEmail1") : t("forgotEmail2")}
          </p>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}
        {resetMessage && (
          <p className="text-green-400 text-sm">{resetMessage}</p>
        )}
        <div className="mb-5">
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
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
          {formik.touched.email && formik.errors.email && (
            <p className="text-red-500 text-sm">{formik.errors.email}</p>
          )}
        </div>

        {!isForgotPassword && (
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
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                aria-label={
                  showPassword ? v("hidePassword") : v("showPassword")
                }
              >
                {showPassword ? <LuEye size={20} /> : <LuEyeOff size={20} />}
              </button>
            </div>
            {formik.touched.password && formik.errors.password && (
              <p className="text-red-500 text-sm">{formik.errors.password}</p>
            )}
          </div>
        )}

        {!isForgotPassword && (
          <button
            type="button"
            onClick={toggleForgotPassword}
            className="text-right text-sm w-full my-2"
          >
            {t("forgot")}
          </button>
        )}

        <button
          type="submit"
          disabled={formik.isSubmitting}
          className="w-full primaryBtn"
        >
          {isForgotPassword ? t("resetLink") : t("loginEmail")}
        </button>

        {isForgotPassword && (
          <button
            type="button"
            onClick={toggleForgotPassword}
            className="w-full mt-4 text-sm text-gray-600 hover:underline"
          >
            {t("back")}
          </button>
        )}

        {!isForgotPassword && (
          <>
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="btn w-full border-0 rounded-full py-2 mt-4 mb-1 text-textColor flex gap-2 items-center justify-center"
            >
              <IconsLibrary name="solidGoogle" /> {t("loginGoogle")}
            </button>

            <p className="text-center">
              {t("accountLogin")}{" "}
              <button
                type="button"
                onClick={onSwitchToSignUp}
                className="text-orange hover:underline"
              >
                {t("register")}
              </button>
            </p>
          </>
        )}
      </form>
    </>
  );
}
