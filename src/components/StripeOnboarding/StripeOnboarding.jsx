"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import BusinessTypeSelection from "@/components/BusinessTypeSelection/BusinessTypeSelection";
import api from "@/lib/axios";
import Swal from "sweetalert2";

const StripeOnboarding = ({
  userId,
  email,
  isStripeConnected,
  stripeAccountId,
  existingBusinessType,
  vatInfo: vatInfoProp,
  onSuccess,
}) => {
  const [selectedBusinessType, setSelectedBusinessType] = useState(
    existingBusinessType || "individual" // Default to individual if no existing type
  );
  const [isLoading, setIsLoading] = useState(false);
  const [showBusinessTypeSelection, setShowBusinessTypeSelection] = useState(
    !isStripeConnected
  );

  const t = useTranslations("BusinessType");
  const tAlert = useTranslations("Sweetalert");

  // Update selected business type when existingBusinessType changes
  useEffect(() => {
    if (existingBusinessType) {
      setSelectedBusinessType(existingBusinessType);
    }
  }, [existingBusinessType]);

  const handleBusinessTypeSelect = (businessType) => {
    setSelectedBusinessType(businessType);
  };

  const handleContinue = async () => {
    if (!selectedBusinessType) {
      Swal.fire({
        title: tAlert("error"),
        text: "Please select a business type",
        icon: "error",
        timer: 3000,
      });
      return;
    }
    try {
      // Prefer freshest VAT info from parent if provided; fallback to API fetch
      let vatInfo = vatInfoProp;
      if (!vatInfo) {
        const vatRes = await api.get(`/vat/update-info?userId=${userId}`);
        vatInfo = vatRes?.data?.vatInfo || vatRes?.vatInfo;
      }
      const hasBasics = !!vatInfo?.registrationCountry; // businessType no longer stored in schema
      const needsNumber = !!vatInfo?.needsVatOnCommission;
      const hasAcceptableVatNumber =
        !!vatInfo?.vatNumber && ["valid", "verified", "pending"].includes(String(vatInfo?.vatStatus).toLowerCase());
      if (!hasBasics || (needsNumber && !hasAcceptableVatNumber)) {
        Swal.fire({
          title: tAlert("error"),
          text: tAlert("completeStripeMsg"),
          icon: "error",
          timer: 5000,
          customClass:{
            confirmButton:"primaryBtn"
          }
        });
        return;
      }

      setIsLoading(true);

      const response = await api.post("/payments/create-connect-account", {
        userId,
        email,
        businessType: selectedBusinessType,
      });

      // Handle both nested and direct response structures
      const responseData = response.data?.data || response.data;

      if (responseData.success) {
        // If there's an onboarding URL, redirect to Stripe
        if (responseData.onboardingUrl) {
          window.location.href = responseData.onboardingUrl;
        } else if (responseData.verificationStatus === "verified") {
          // Account is already verified, no need for onboarding

          setShowBusinessTypeSelection(false);
        } else {
          // Success but no URL and not verified - this shouldn't happen
          console.error(
            "Unexpected state: success but no onboarding URL and not verified"
          );
          throw new Error("Account setup incomplete");
        }

        // Call success callback if provided
        if (onSuccess) {
          onSuccess(responseData);
        }
      } else {
        console.error("API returned success: false", responseData);
        throw new Error("Failed to create or access Stripe account");
      }
    } catch (error) {
      console.error("Error creating Stripe account:", error);

      // Handle different error response structures
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Failed to create Stripe account";

      Swal.fire({
        title: tAlert("error"),
        text: errorMessage,
        icon: "error",
        timer: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditAccount = async () => {
    if (!stripeAccountId) {
      Swal.fire({
        title: tAlert("error"),
        text: "No Stripe account found",
        icon: "error",
        timer: 3000,
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post("/payments/create-account-link", {
        userId,
        stripeAccountId,
      });

      // Handle both nested and direct response structures
      const responseData = response.data?.data || response.data;

      if (responseData.success && responseData.url) {
        window.location.href = responseData.url;
      } else {
        throw new Error("Failed to generate account link");
      }
    } catch (error) {
      console.error("Error creating account link:", error);

      // Handle different error response structures
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Failed to open Stripe dashboard";

      Swal.fire({
        title: tAlert("error"),
        text: errorMessage,
        icon: "error",
        timer: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isStripeConnected && !showBusinessTypeSelection) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="w-5 h-5 text-green-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Stripe Account Connected
              </h3>
            </div>
          </div>
        </div>

        <button
          onClick={handleEditAccount}
          disabled={isLoading}
          className="primaryBtn w-full"
        >
          {isLoading ? "Opening..." : "Manage Stripe Account"}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <BusinessTypeSelection
        onSelect={handleBusinessTypeSelect}
        selectedType={selectedBusinessType}
        disabled={isLoading}
      />

      {selectedBusinessType && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleContinue}
            disabled={isLoading}
            className="primaryBtn px-8 py-3"
          >
            {isLoading ? "Creating Account..." : t("continue")}
          </button>
        </div>
      )}
    </div>
  );
};

export default StripeOnboarding;
