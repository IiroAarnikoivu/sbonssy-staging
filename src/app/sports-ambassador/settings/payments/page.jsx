"use client";

import SettingsSidebar from "@/components/SettingsSidebar";
import StripeOnboarding from "@/components/StripeOnboarding/StripeOnboarding";
import VATInformationForm from "@/components/VATInformationForm";
import Loader from "@/components/Loader";
import api from "@/lib/axios";
import { toCamelCase } from "@/lib/helper";
import { useAuthStore } from "@/store/authStore";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { isEUCountry } from "@/lib/vat/viesValidator";

const Payments = () => {
  const router = useRouter();
  const { user } = useAuthStore();
  const userId = user?.onboardedDetails?._id;
  const email = user?.onboardedDetails?.email;
  const t = useTranslations("Payments.sports");
  const tVAT = useTranslations("VAT");
  const subRole = toCamelCase(user?.onboardedDetails?.subRole) || "";
  const isStripeConnected =
    !!user?.onboardedDetails?.[subRole]?.stripeAccountId || false;
  const stripeAccountId =
    user?.onboardedDetails?.[subRole]?.stripeAccountId || "";
  // businessType removed from profile schema; Stripe onboarding no longer needs it here

  const [activeTab, setActiveTab] = useState("vat");
  const [updateMessage, setUpdateMessage] = useState("");
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [verificationRequirements, setVerificationRequirements] = useState([]);
  const [accountDetails, setAccountDetails] = useState(null);
  const toastAlert = useTranslations("Sweetalert");

  const [vatLoading, setVatLoading] = useState(false);
  const [vatUpdating, setVatUpdating] = useState(false);
  const [vatInfo, setVatInfo] = useState(null);

  // Helper function to check if VAT information is complete
  const isVATComplete = () => {
    if (!vatInfo) return false;
    const hasBasics = !!vatInfo?.registrationCountry;
    const needsNumber = !!vatInfo?.needsVatOnCommission;
    const hasAcceptableVatNumber =
      !!vatInfo?.vatNumber && ["valid", "verified", "pending"].includes(String(vatInfo?.vatStatus).toLowerCase());
    return hasBasics && (!needsNumber || hasAcceptableVatNumber);
  };

  // Country label mapping (match VATInformationForm lists)
  const euCountries = [
    { code: "AT", name: "Austria / Österreich" },
    { code: "BE", name: "Belgium / België" },
    { code: "BG", name: "Bulgaria / България" },
    { code: "HR", name: "Croatia / Hrvatska" },
    { code: "CY", name: "Cyprus / Κύπρος" },
    { code: "CZ", name: "Czech Republic / Česká republika" },
    { code: "DK", name: "Denmark / Danmark" },
    { code: "EE", name: "Estonia / Eesti" },
    { code: "FI", name: "Finland / Suomi" },
    { code: "FR", name: "France / France" },
    { code: "DE", name: "Germany / Deutschland" },
    { code: "GR", name: "Greece / Ελλάδα" },
    { code: "HU", name: "Hungary / Magyarország" },
    { code: "IE", name: "Ireland / Éire" },
    { code: "IT", name: "Italy / Italia" },
    { code: "LV", name: "Latvia / Latvija" },
    { code: "LT", name: "Lithuania / Lietuva" },
    { code: "LU", name: "Luxembourg / Lëtzebuerg" },
    { code: "MT", name: "Malta / Malta" },
    { code: "NL", name: "Netherlands / Nederland" },
    { code: "PL", name: "Poland / Polska" },
    { code: "PT", name: "Portugal / Portugal" },
    { code: "RO", name: "Romania / România" },
    { code: "SK", name: "Slovakia / Slovensko" },
    { code: "SI", name: "Slovenia / Slovenija" },
    { code: "ES", name: "Spain / España" },
    { code: "SE", name: "Sweden / Sverige" },
  ];
  const nonEuCountries = [
    { code: "AL", name: "Albania / Shqipëria" },
    { code: "AD", name: "Andorra / Andorra" },
    { code: "AM", name: "Armenia / Հայաստան" },
    { code: "AZ", name: "Azerbaijan / Azərbaycan" },
    { code: "BY", name: "Belarus / Беларусь" },
    { code: "BA", name: "Bosnia and Herzegovina / Bosna i Hercegovina" },
    { code: "GE", name: "Georgia / საქართველო" },
    { code: "IS", name: "Iceland / Ísland" },
    { code: "XK", name: "Kosovo / Kosovë" },
    { code: "LI", name: "Liechtenstein / Liechtenstein" },
    { code: "MD", name: "Moldova / Republica Moldova" },
    { code: "MC", name: "Monaco / Monaco" },
    { code: "ME", name: "Montenegro / Crna Gora" },
    { code: "MK", name: "North Macedonia / Северна Македонија" },
    { code: "NO", name: "Norway / Norge" },
    { code: "SM", name: "San Marino / San Marino" },
    { code: "RS", name: "Serbia / Србија" },
    { code: "CH", name: "Switzerland / Schweiz" },
    { code: "UA", name: "Ukraine / Україна" },
    { code: "GB", name: "United Kingdom / United Kingdom" },
    { code: "VA", name: "Vatican City / Città del Vaticano" },
  ];
  const countryLabel = (code) => {
    const c = [...euCountries, ...nonEuCountries].find(
      (x) => x.code === (code || "").toUpperCase(),
    );
    return c?.name || code || "";
  };

  // Check verification status and account details on mount
  useEffect(() => {
    if (isStripeConnected && stripeAccountId) {
      const checkVerification = async () => {
        try {
          const response = await api.post("/payments/check-verification", {
            userId,
            stripeAccountId,
          });
          if (response.data.success) {
            setVerificationStatus(response.data.verificationStatus);
            setVerificationRequirements(response.data.requirements || []);
            setAccountDetails(response.data.accountDetails || null);
            if (response.data.verificationStatus === "action_required") {
              Swal.fire({
                title: toastAlert("actionRequiredTitle"),
                text: toastAlert("actionRequiredTxt"),
                icon: "warning",
                showConfirmButton: true,
                confirmButtonText: toastAlert("ok"),
                customClass: {
                  confirmButton: "confirmButton",
                  cancelButton: "cancelButton",
                },
                timer: 5000,
              });
            } else if (!response.data.accountDetails) {
              Swal.fire({
                title: toastAlert("bankAccountTitle"),
                text: toastAlert("bankAccountTxt"),
                icon: "warning",
                showConfirmButton: true,
                confirmButtonText: toastAlert("ok"),
                customClass: {
                  confirmButton: "confirmButton",
                  cancelButton: "cancelButton",
                },
                timer: 5000,
              });
            }
          } else {
            throw new Error("verification_check_failed");
          }
        } catch (err) {
          console.error("Error checking verification status:", err);
          setUpdateMessage(t("verificationCheckFailed"));
          setTimeout(() => setUpdateMessage(""), 3000);
        }
      };
      checkVerification();
    }
  }, [isStripeConnected, stripeAccountId, userId]);

  const handleVATUpdate = async (updateData) => {
    try {
      setVatUpdating(true);
      const id = user?._id || userId;
      const response = await api.post("/vat/update-info", {
        userId: id,
        ...updateData,
      });
      const resData = response?.data?.user ? response.data : response;
      if (resData?.success) {
        setVatInfo(resData.user.vatInfo);
        // Refresh global auth store to ensure other parts of the app have latest VAT data
        const { fetchUser } = useAuthStore.getState();
        await fetchUser();

        Swal.fire({
          icon: "success",
          title: tVAT("ui.updateSuccessText"),
          timer: 3000,
          toast: true,
          position: "top-right",
          showConfirmButton: false,
        });

        // After successful VAT update, switch to Stripe tab
        setTimeout(() => {
          setActiveTab("stripe");
        }, 500);
      }
    } catch (error) {
      console.error("Failed to update VAT info:", error);
      Swal.fire({
        icon: "error",
        title: toastAlert("error"),
        text: error?.error || tVAT("ui.updateError"),
      });
    } finally {
      setVatUpdating(false);
    }
  };

  useEffect(() => {
    if (activeTab === "vat" && (user?._id || userId)) {
      const loadVATInfo = async () => {
        try {
          setVatLoading(true);
          const id = user?._id || userId;
          const response = await api.get(`/vat/update-info?userId=${id}`);
          const resData = response?.data?.vatInfo ? response.data : response;
          if (resData?.success) {
            setVatInfo(resData.vatInfo);
          }
        } catch (error) {
          console.error("Failed to load VAT info:", error);
          Swal.fire({
            icon: "error",
            title: toastAlert("error"),
            text: tVAT("ui.loadError"),
          });
        } finally {
          setVatLoading(false);
        }
      };
      loadVATInfo();
    }
  }, [activeTab, user?._id, userId]);

  // Preload VAT info on mount so the form doesn't flash defaults on first open
  useEffect(() => {
    const preload = async () => {
      try {
        if (!(user?._id || userId)) return;
        const id = user?._id || userId;
        const response = await api.get(`/vat/update-info?userId=${id}`);
        const resData = response?.data?.vatInfo ? response.data : response;
        if (resData?.success) {
          setVatInfo(resData.vatInfo);
        }
      } catch (e) {
        // silent fail; will load on tab open
      }
    };
    preload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStripeSuccess = (data) => {
    setVerificationStatus(data.verificationStatus);
    setAccountDetails(data.accountDetails || null);
    setUpdateMessage(t("redirectOnboarding"));
    setTimeout(() => setUpdateMessage(""), 3000);
  };

  const editStripeAccount = async () => {
    if (!stripeAccountId) {
      Swal.fire({
        title: toastAlert("noStripeAccountTitle"),
        text: toastAlert("noStripeAccountTxt"),
        icon: "warning",
        showConfirmButton: true,
        confirmButtonText: toastAlert("ok"),
        customClass: {
          confirmButton: "confirmButton",
          cancelButton: "cancelButton",
        },
        timer: 5000,
      });
      setUpdateMessage(t("noStripeAccount"));
      setTimeout(() => setUpdateMessage(""), 3000);
      return;
    }

    try {
      const response = await api.post("/payments/create-account-link", {
        userId,
        stripeAccountId,
      });
      if (response.data.success && response.data.url) {
        setVerificationStatus(response.data.verificationStatus);
        setVerificationRequirements(response.data.requirements || []);
        setAccountDetails(response.data.accountDetails || null);
        window.location.href = response.data.url; // Redirect to Stripe Dashboard
        setUpdateMessage(t("redirectDashboard"));
        setTimeout(() => setUpdateMessage(""), 3000);
      } else {
        throw new Error("account_link_failed");
      }
    } catch (err) {
      console.error("Error generating Stripe Account Link:", err);
      Swal.fire({
        title: toastAlert("error"),
        text: toastAlert("stripeErrorTxt"),
        icon: "error",
        timer: 5000,
      });
      setUpdateMessage(t("redirectDashboardFailed"));
      setTimeout(() => setUpdateMessage(""), 3000);
    }
  };

  // Get verification status display text
  const getVerificationStatusText = () => {
    switch (verificationStatus) {
      case "verified":
        return t("verified");
      case "action_required":
        return `${t("action")} ${
          verificationRequirements.join(", ") || t("unknown")
        }`;
      case "pending":
        return t("pending");
      default:
        return isStripeConnected ? t("statusCheck") : t("connection");
    }
  };

  // Get masked account number
  const getMaskedAccountNumber = (last4) => {
    return last4 ? `XXXX-XXXX-XXXX-${last4}` : t("na");
  };

  return (
    <div className="flex flex-col min-h-screen">
      <div className="md:flex flex-1 bg-white">
        <SettingsSidebar role={"sports-ambassador"} />
        <div className="md:w-4/5 md:p-6 px-3 py-6">
          <h2 className="text-lg font-semibold mb-4">{t("settings")}</h2>

          <div className="border-b mb-6">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {/* VAT Tab - Always accessible, first tab */}
              <button
                onClick={() => {
                  setVatLoading(true);
                  setActiveTab("vat");
                }}
                className={`${
                  activeTab === "vat"
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap pb-2 px-1 border-b-2 text-sm font-medium`}
              >
                {t("vatTab") || "VAT"}
              </button>
              {/* Stripe Tab - Locked until VAT is complete */}
              <button
                onClick={() => {
                  if (isVATComplete()) {
                    setActiveTab("stripe");
                  } else {
                    Swal.fire({
                      title: toastAlert("error"),
                      text: tVAT("ui.completeVATFirst") || "Please complete your VAT information first.",
                      icon: "warning",
                      confirmButtonText: toastAlert("ok"),
                      customClass: {
                        confirmButton: "primaryBtn",
                      },
                    });
                  }
                }}
                disabled={!isVATComplete()}
                className={`${
                  activeTab === "stripe"
                    ? "border-orange-500 text-orange-600"
                    : !isVATComplete()
                      ? "border-transparent text-gray-400 cursor-not-allowed"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap pb-2 px-1 border-b-2 text-sm font-medium relative`}
              >
                {t("stripeTab") || "Stripe"}
                {!isVATComplete() && (
                  <svg
                    className="w-4 h-4 inline-block ml-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            </nav>
          </div>

          {activeTab === "stripe" && (
            <>
              <p className="mb-4">
                {t("accountId")} {stripeAccountId || t("notConnected")}
              </p>
              {isStripeConnected && (
                <div className="mb-4">
                  <p
                    className={`text-sm ${
                      verificationStatus === "verified"
                        ? "text-green-600"
                        : "text-orange-600"
                    }`}
                  >
                    {getVerificationStatusText()}
                  </p>
                  {accountDetails ? (
                    <div className="mt-2 text-sm text-gray-600">
                      <p>
                        {t("bankName")} {accountDetails.bankName}
                      </p>
                      <p>
                        {t("accountNumber")}{" "}
                        {getMaskedAccountNumber(accountDetails.last4)}
                      </p>
                      <p>
                        {t("accountHolder")} {accountDetails.accountHolderName}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-orange-600">
                      {t("fallback")}
                    </p>
                  )}
                </div>
              )}
              <div className="max-w-2xl">
                <StripeOnboarding
                  userId={userId}
                  email={email}
                  isStripeConnected={isStripeConnected}
                  stripeAccountId={stripeAccountId}
                  vatInfo={vatInfo}
                  onSuccess={handleStripeSuccess}
                />
                {updateMessage && (
                  <p
                    className={`mt-4 text-sm ${
                      updateMessage.includes("...")
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {updateMessage}
                  </p>
                )}
              </div>
            </>
          )}

          {activeTab === "vat" && (
            <div className="max-w-3xl">
              <div className="mb-6">
                <h3 className="text-lg font-semibold">{tVAT("title")}</h3>
                <p className="mt-1 text-gray-600">{tVAT("ui.manageDescAmb")}</p>
              </div>
              {vatLoading || vatInfo === null ? (
                <Loader />
              ) : (
                <>
                  <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
                    <h4 className="text-md font-semibold mb-4">
                      {tVAT("ui.currentStatus")}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="block text-sm font-medium text-gray-500">
                          {tVAT("ui.registrationCountry")}
                        </span>
                        <span className="text-gray-900">
                          {countryLabel(vatInfo.registrationCountry) ||
                            t("notSet")}
                        </span>
                      </div>
                      {/* businessType removed from schema; not displayed */}
                      <div>
                        <span className="block text-sm font-medium text-gray-500">
                          {tVAT("ui.vatNumber")}
                        </span>
                        <span className="text-gray-900">
                          {vatInfo.vatNumber || t("notProvided")}
                        </span>
                      </div>
                      {!isEUCountry(vatInfo.registrationCountry || "") && (
                        <div>
                          <span className="block text-sm font-medium text-gray-500">
                            {tVAT("nonEu.registrationNumberLabel")}
                          </span>
                          <span className="text-gray-900">
                            {vatInfo.businessRegistrationNumber ||
                              t("notProvided")}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="block text-sm font-medium text-gray-500">
                          {tVAT("ui.vatStatus")}
                        </span>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            vatInfo.vatStatus === "valid"
                              ? "bg-green-100 text-green-800"
                              : vatInfo.vatStatus === "invalid"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {vatInfo.vatStatus || t("notProvided")}
                        </span>
                      </div>
                      <div>
                        <span className="block text-sm font-medium text-gray-500">
                          {tVAT("ui.vatOnCommission")}
                        </span>
                        <span className="text-gray-900">
                          {vatInfo.needsVatOnCommission
                            ? tVAT("ui.yes")
                            : tVAT("ui.no")}
                          {vatInfo.needsVatOnCommission && vatInfo.vatRate && (
                            <span className="text-sm text-gray-500 ml-1">
                              ({(vatInfo.vatRate * 100).toFixed(1)}%)
                            </span>
                          )}
                        </span>
                      </div>
                      {vatInfo.lastVatCheckedAt && (
                        <div>
                          <span className="block text-sm font-medium text-gray-500">
                            {tVAT("ui.lastChecked")}
                          </span>
                          <span className="text-gray-900">
                            {new Date(
                              vatInfo.lastVatCheckedAt,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <VATInformationForm
                    user={vatInfo}
                    onUpdate={handleVATUpdate}
                    className="mb-6"
                  />

                  {vatUpdating && (
                    <div className="fixed inset-0  flex items-center justify-center z-50">
                      <div className="bg-white rounded-lg p-6 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f26915] mx-auto"></div>
                        <p className="mt-4 text-gray-600">
                          {tVAT("ui.updating")}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Payments;
