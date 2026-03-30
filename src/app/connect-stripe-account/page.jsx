"use client";

import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import React from "react";

const ConnectStripeAccount = () => {
  const { user } = useAuthStore();
  const userId = user?.onboardedDetails?._id;
  const email = user?.onboardedDetails?.email;
  const connectStripeAccount = async () => {
    const body = {
      userId,
      email,
    };
    
    // Pre-open window for Safari compatibility
    const newWindow = window.open("", "_blank");
    
    try {
      const resp = await api.post("/payments/create-connect-account", body);
      if (resp.success && resp.onboardingUrl) {
        if (newWindow) {
          newWindow.location.href = resp.onboardingUrl;
        } else {
          window.open(resp.onboardingUrl, "_blank");
        }
      } else {
        if (newWindow) newWindow.close();
        alert(resp.message || "Failed to create connect account");
      }
    } catch (error) {
      console.error("Stripe connect error:", error);
      if (newWindow) newWindow.close();
      alert("An error occurred while connecting to Stripe");
    }
  };
  return (
    <div>
      <button
        onClick={() => {
          connectStripeAccount();
        }}
      >
        Connect
      </button>
    </div>
  );
};

export default ConnectStripeAccount;
