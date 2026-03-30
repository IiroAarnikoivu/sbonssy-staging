"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import createClient from "@/lib/supabase/client";
import { useAuthStore } from "@/store/authStore";
import Swal from "sweetalert2";
import { useTranslations } from "next-intl";

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const toastAlert = useTranslations("Sweetalert");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const inviteToken = searchParams.get("token");
        const accessToken = searchParams.get("access_token");
        const refreshToken = searchParams.get("refresh_token");

        // Tokens parsed above; proceed with validation and session handling

        if (!inviteToken) {
          throw new Error("Invalid invitation link: No invite token provided");
        }

        const supabase = createClient();

        // Check for Supabase auth tokens
        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) {
            console.error(
              "[AuthCallback] Set session error:",
              sessionError.message
            );
            throw new Error("Failed to establish session");
          }

          // Get user and register
          const { data: userData, error: userError } =
            await supabase.auth.getUser();
          if (userError || !userData.user) {
            throw new Error("Authentication failed");
          }

          const response = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: userData.user.email, inviteToken }),
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || "Registration failed");
          }

          setUser(result.data.user);
          Swal.fire({
            title: toastAlert("invitationAccepted"),
            icon: "success",
            timer: 2000,
            toast: true,
            showConfirmButton: false,
          });
          router.push("/dashboard");
        } else {
          // No session, redirect to reset password with invite token
          router.push(`/confirm-password?token=${inviteToken}`);
        }
      } catch (error) {
        console.error("[AuthCallback] Error:", error.message);
        Swal.fire({
          title: toastAlert("authFailed"),
          icon: "error",
          timer: 3000,
          toast: true,
          showConfirmButton: false,
        });
        router.push("/authentication");
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
  }, [router, searchParams, setUser]);

  return (
    <div className="flex min-h-screen bg-white items-center justify-center">
      {loading ? <p>Processing invitation...</p> : <p>Redirecting...</p>}
    </div>
  );
}
