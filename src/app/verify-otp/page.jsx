"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Swal from "sweetalert2";
import Link from "next/link";

const RESEND_COOLDOWN = 30; // seconds

export default function VerifyOtpPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const t = useTranslations("Authentication");
  const toastAlert = useTranslations("Sweetalert");

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");

  // Read email + role from sessionStorage (set by RegisterPage)
  useEffect(() => {
    const storedEmail = sessionStorage.getItem("otp_email");
    const storedRole = sessionStorage.getItem("otp_role");

    if (!storedEmail || !storedRole) {
      // Someone navigated here directly without registering — send them back
      router.replace("/authentication");
      return;
    }

    setEmail(storedEmail);
    setRole(storedRole);
  }, []);

  // 6 individual digit inputs
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef([]);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Resend cooldown
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  // Start with a cooldown so the user doesn't immediately spam resend
  useEffect(() => {
    startCooldown();
  }, []);

  const startCooldown = () => {
    setResendCooldown(RESEND_COOLDOWN);
  };

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const otp = digits.join("");

  const handleDigitChange = (index, value) => {
    // Accept only one digit
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setError("");

    // Auto-focus next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = ["", "", "", "", "", ""];
    pasted.split("").forEach((ch, i) => {
      next[i] = ch;
    });
    setDigits(next);
    // Focus the last filled input or the next empty one
    const focusIdx = Math.min(pasted.length, 5);
    inputRefs.current[focusIdx]?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (otp.length < 6) {
      setError(t("otpVerifyError") || "Please enter all 6 digits.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const response = await api.post("/auth/verify-otp", {
        email,
        token: otp,
        role,
      });

      const user = response?.data?.user;

      if (user) {
        setUser({ ...user, onboardedDetails: null });

        // Clear OTP session data now that verification is complete
        sessionStorage.removeItem("otp_email");
        sessionStorage.removeItem("otp_role");

        Swal.fire({
          toast: true,
          position: "top-right",
          title: toastAlert("otpVerified"),
          icon: "success",
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
        });
       
        // Redirect: check if profile is already completed
        const isCompleted = user?.isProfileCompleted || role === "fan";
        const targetPath = isCompleted ? `/${role}` : `/onboarding/${role}`;
        router.push(targetPath);
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message || toastAlert("otpInvalid");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    try {
      setResending(true);
      setError("");
      await api.post("/auth/resend-otp", { email });
      startCooldown();
      Swal.fire({
        toast: true,
        position: "top-right",
        title: toastAlert("otpResent"),
        icon: "info",
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
      });
    } catch (err) {
      const code = err?.response?.data?.code;
      const msg =
        code === "over_email_send_rate_limit"
          ? toastAlert("otpRateLimit")
          : err?.response?.data?.message || toastAlert("otpResendFailed") || "Failed to resend OTP.";
      setError(msg);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 bg-white">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-10 flex justify-center">
          <Image
            alt="Sbonssy"
            src="/assets/logo/logoDesktop.png"
            width={152}
            height={43}
            className="invert-100"
          />
        </div>

        {/* Card */}
        <div className="text-center mb-8">
          {/* Email icon */}
          <div className="mb-5 flex justify-center">
            <div className="w-16 h-16 rounded-full bg-orange/10 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-orange"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>

          <h1 className="text-3xl lg:text-4xl font-semibold mb-2">
            {t("otpTitle")}
          </h1>
          <p className="text-gray-500 text-sm">
            {t("otpSubTitleSendTo")}
          </p>
          <p className="font-medium text-base mt-1 mb-6">{email}</p>
        </div>

        {/* OTP Form */}
        <form onSubmit={handleSubmit}>
          {/* Digit inputs */}
          <div className="flex gap-3 justify-center mb-4" onPaste={handlePaste}>
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (inputRefs.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={`w-12 h-14 text-center text-xl font-semibold border-2 rounded-lg outline-none transition-all
                  ${digit ? "border-black" : "border-gray-300"}
                  focus:border-black focus:ring-0`}
                autoComplete="one-time-code"
              />
            ))}
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-500 text-sm text-center mb-3">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || otp.length < 6}
            className="w-full primaryBtn mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "..." : t("otpVerify")}
          </button>
        </form>

        {/* Resend */}
        <div className="mt-5 text-center text-sm text-gray-500">
          {t("otpNotReceived")}{" "}
          {resendCooldown > 0 ? (
            <span className="font-medium text-gray-400">
              {t("otpResendIn", { seconds: resendCooldown })}
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="font-medium text-orange hover:underline disabled:opacity-60"
            >
              {resending ? "..." : t("otpResend")}
            </button>
          )}
        </div>

        {/* Back to login */}
        <div className="mt-4 text-center text-sm">
          <button
            type="button"
            onClick={() => router.push("/authentication?tab=login")}
            className="text-gray-500 hover:text-black hover:underline"
          >
            ← {t("otpBackToLogin")}
          </button>
        </div>
      </div>
    </div>
  );
}
