"use client";

import SettingsSidebar from "@/components/SettingsSidebar";
import Pagination from "@/components/Pagination/pagination";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import React, { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useTranslations } from "next-intl";
import VATInformationForm from "@/components/VATInformationForm";
import Loader from "@/components/Loader";
import { isEUCountry } from "@/lib/vat/viesValidator";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
);

const AddCardForm = ({ userId, stripeId, role, onCardAdded, hasCard }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const toastAlert = useTranslations("Sweetalert");
  const t = useTranslations("Settings.payments");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setProcessing(true);
    setError(null);

    if (!stripe || !elements) {
      setError("Stripe.js has not loaded. Please try again.");
      setProcessing(false);
      return;
    }

    const cardElement = elements.getElement(CardElement);

    try {
      const { paymentMethod, error } = await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
      });

      if (error) {
        setError(error.message);
        setProcessing(false);
        return;
      }

      const endpoint =
        role === "brand"
          ? "/payments/add-payment-method"
          : "/payments/add-ambassador-payment-method";
      const payload =
        role === "brand"
          ? {
              userId,
              stripeCustomerId: stripeId,
              paymentMethodToken: paymentMethod.id,
            }
          : {
              userId,
              paymentMethodToken: paymentMethod.id,
            };

      const response = await api.post(endpoint, payload);

      if (response.data.success) {
        Swal.fire({
          title: toastAlert("success"),
          text: toastAlert("paymentTxt"),
          toast: true,
          showConfirmButton: false,
          position: "top-right",
          icon: "success",
          timer: 3000,
        });
        onCardAdded(response.data.paymentMethod);
        cardElement.clear();
      } else {
        throw new Error(response.data.error || "Failed to add payment method");
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.error ||
        err.message ||
        "Failed to add payment method";
      setError(errorMessage);
      Swal.fire({
        title: toastAlert("error"),
        text: toastAlert("cardAddErrorText"),
        toast: true,
        showConfirmButton: false,
        position: "top-right",
        icon: "error",
        timer: 5000,
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border border-gray-200 rounded-[50px] p-4 bg-gray-50">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: "16px",
                color: "#1f2937",
                "::placeholder": { color: "#9ca3af" },
              },
              invalid: { color: "#dc2626" },
            },
          }}
        />
      </div>
      {error && (
        <div className="flex items-center text-red-600 text-sm">
          <span className="mr-2">!</span>
          {error}
        </div>
      )}
      <button
        type="submit"
        className="w-full bg-[#f26915] text-white py-2 px-4 rounded-[50px] hover:bg-[#d65e13] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        disabled={processing || !stripe || !elements || hasCard}
      >
        {processing ? (
          <>
            <span className="mr-2">⌛</span>
            {t("processing")}
          </>
        ) : hasCard ? (
          t("addedCard")
        ) : (
          t("addCard")
        )}
      </button>
    </form>
  );
};

const CardList = ({ card, onDelete, t, canManage }) => (
  <div className="grid grid-cols-1 gap-4">
    {card && (
      <div className="bg-white border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="font-medium">
              {t("card")}: **** **** **** {card.last4}
            </p>
            <p className="text-sm text-gray-600 capitalize">{card.brand}</p>
            <p className="text-sm text-gray-600">
              {t("expires")}: {card.exp_month}/{card.exp_year}
            </p>
          </div>
          {canManage && (
            <button
              onClick={() => onDelete(card)}
              className="text-red-600 text-sm hover:text-red-800"
            >
              {t("delete")}
            </button>
          )}
        </div>
      </div>
    )}
  </div>
);
const InvoiceList = ({
  invoices,
  card,
  onPay,
  onDownload,
  formatAmount,
  payingInvoiceId,
}) => {
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState({});
  const t = useTranslations("Settings.payments");
  const handlePaymentMethodChange = (invoiceId, paymentMethodId) => {
    setSelectedPaymentMethods((prev) => ({
      ...prev,
      [invoiceId]: paymentMethodId,
    }));
  };

  const sortInvoiceLineItems = (items) => {
    if (!Array.isArray(items)) return [];
    const order = {
      ambassador_earnings: 1,
      platform_fee: 2,
      vat: 3,
      stripe_processing_fee: 4,
    };
    return [...items].sort((a, b) => {
      const aKey = a?.metadata?.type || "";
      const bKey = b?.metadata?.type || "";
      const aOrder = order[aKey] ?? 99;
      const bOrder = order[bKey] ?? 99;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return String(a?.description || "").localeCompare(
        String(b?.description || ""),
      );
    });
  };

  return (
    <div className="space-y-4">
      {invoices.map((invoice) => (
        <div
          key={invoice.id}
          className="bg-white border border-gray-200 rounded-[50px] p-6 shadow-sm"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">
                <strong>{t("invoiceId")}:</strong> {invoice.stripeInvoiceId}
              </p>
              <p className="text-sm text-gray-600">
                <strong>{t("campaignId")}:</strong> {invoice.campaignId}
              </p>
              <p className="text-sm text-gray-600">
                <strong>{t("amount")}:</strong>{" "}
                {formatAmount(invoice.amount, invoice.currency)}
              </p>
              <p className="text-sm text-gray-600">
                <strong>{t("status")}:</strong>{" "}
                {invoice.status.charAt(0).toUpperCase() +
                  invoice.status.slice(1)}
              </p>
              <p className="text-sm text-gray-600">
                <strong>{t("period")}:</strong>{" "}
                {new Date(invoice.periodStart).toLocaleDateString()} -{" "}
                {new Date(invoice.periodEnd).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-600">
                <strong>{t("created")}:</strong>{" "}
                {new Date(invoice.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">
                <strong>{t("details")}:</strong>
              </p>
              <ul className="list-disc ml-6 text-sm text-gray-600">
                {sortInvoiceLineItems(invoice.lineItems).map((item, index) => (
                  <li key={index}>
                    {item.description}:{" "}
                    {formatAmount(item.amount, invoice.currency)}
                    {item.metadata?.athleteId && (
                      <span>
                        {" "}
                        ({t("athleteId")}: {item.metadata.athleteId})
                      </span>
                    )}
                    <></>
                  </li>
                ))}
              </ul>
              <div className="mt-4 space-y-2">
                {["open", "draft"].includes(invoice.status) && (
                  <div>
                    {card ? (
                      <div className="mb-2">
                        <p className="text-sm text-gray-600">
                          {t("paymentMethod")}:
                        </p>
                        <p className="text-sm font-medium">
                          {card.brand} {t("ending")} {card.last4} (
                          {t("expires")}: {card.exp_month}/{card.exp_year})
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-red-600">{t("fallback3")}</p>
                    )}
                    {process.env.NODE_ENV === "development" && (
                      <button
                        className="mt-2 bg-[#3B0029] text-white px-4 py-2 rounded-[50px] hover:bg-[#2c001f] disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() =>
                          onPay(invoice.stripeInvoiceId, card?.paymentMethodId)
                        }
                        disabled={!card || !!payingInvoiceId}
                      >
                        {payingInvoiceId === invoice.stripeInvoiceId ? (
                          <>
                            <span className="mr-2">⌛</span>
                            {t("processing")}
                          </>
                        ) : (
                          t("payInvoice")
                        )}
                      </button>
                    )}
                  </div>
                )}
                <button
                  className="bg-[#f26915] text-white px-4 py-2 rounded-[50px] hover:bg-[#d65e13] disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => onDownload(invoice.stripeInvoiceId)}
                >
                  {t("downloadInvoice")}
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const Payments = () => {
  const router = useRouter();
  const { user } = useAuthStore();
  const role = user?.onboardedDetails?.role;
  const subRole = user?.subRole?.toLowerCase();
  // If this brand user is invited by another brand owner, use inviter's account for payments
  const brandOwner =
    role === "brand" && user?.onboardedDetails?.invitedBy
      ? user?.onboardedDetails?.invitedBy
      : user?.onboardedDetails;

  const userId =
    role === "brand" ? brandOwner?._id : user?.onboardedDetails?._id;

  const email =
    role === "brand" ? brandOwner?.email : user?.onboardedDetails?.email;

  const toastAlert = useTranslations("Sweetalert");
  const isStripeConnected =
    role === "brand"
      ? !!brandOwner?.brand?.stripeCustomerId
      : !!user?.[subRole]?.stripeAccountId;
  const stripeId =
    role === "brand"
      ? brandOwner?.brand?.stripeCustomerId || ""
      : user?.[subRole]?.stripeAccountId || "";

  const canManageCards = role === "brand" && !user?.onboardedDetails?.invitedBy;

  const [updateMessage, setUpdateMessage] = useState("");
  const [cards, setCards] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [activeTab, setActiveTab] = useState("cards");
  const [loading, setLoading] = useState(false);
  const [card, setCard] = useState(null);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [invoicePagination, setInvoicePagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [payingInvoiceId, setPayingInvoiceId] = useState(null);

  // VAT state for brand
  const tVAT = useTranslations("VAT");
  const [vatLoading, setVatLoading] = useState(false);
  const [vatUpdating, setVatUpdating] = useState(false);
  const [vatInfo, setVatInfo] = useState(null);
  console.log("vatInfo", vatInfo);

  const isVATReady = (() => {
    if (!vatInfo?.registrationCountry) return false;
    return true;
  })();

  console.log(isVATReady, "isVATReady");

  const handleCardAdded = useCallback((newCard) => {
    setCard(newCard);

    setActiveTab("cards");
  }, []);

  const fetchPaymentMethods = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/payments/payment-methods");

      if (response.data.data) {
        // setCards(response.data.data || []);
        setCard(response.data.data[0] || null);
        setActiveTab("cards");
      } else {
        throw new Error("Failed to retrieve payment methods");
      }
    } catch (err) {
      setUpdateMessage("Failed to retrieve payment methods");
      setTimeout(() => setUpdateMessage(""), 3000);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInvoices = useCallback(
    async (page = 1) => {
      if (role !== "brand") return;
      setInvoicesLoading(true);
      try {
        const response = await api.post("/payments/list-invoices-by-customer", {
          brandId: userId,
          page,
          limit: invoicePagination.limit,
        });
        // Support both new flat shape and legacy nested shape
        if (response?.success) {
          setInvoices(response.data || []);
          if (response.pagination) {
            setInvoicePagination(response.pagination);
          }
        } else if (response.data?.data?.success) {
          setInvoices(response.data.data.invoices || []);
          // Legacy had no pagination; keep existing state
        } else {
          throw new Error(response.data.error || "Failed to retrieve invoices");
        }
      } catch (err) {
        setUpdateMessage(
          err.response?.data?.error || "Failed to retrieve invoices",
        );
        setTimeout(() => setUpdateMessage(""), 3000);
      } finally {
        setInvoicesLoading(false);
      }
    },
    [role, userId, invoicePagination.limit],
  );

  const handleInvoicePageChange = useCallback(
    (page) => {
      if (page >= 1 && page <= (invoicePagination.totalPages || 1)) {
        fetchInvoices(page);
      }
    },
    [fetchInvoices, invoicePagination.totalPages],
  );

  useEffect(() => {
    if (
      isStripeConnected &&
      stripeId &&
      (role === "brand" || role === "sports-ambassador")
    ) {
      fetchPaymentMethods();
      if (role === "brand") fetchInvoices(1);
    }
  }, [isStripeConnected, stripeId, role, fetchPaymentMethods, fetchInvoices]);

  // VAT: load when VAT tab is active
  useEffect(() => {
    if (activeTab === "vat") {
      const loadVATInfo = async () => {
        try {
          if (!userId) {
            setVatLoading(false);
            return;
          }
          setVatLoading(true);
          const response = await api.get(`/vat/update-info?userId=${userId}`);
          const resData = response?.data?.vatInfo ? response.data : response;
          if (resData?.success) {
            setVatInfo(resData.vatInfo);
          }
        } catch (error) {
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
  }, [activeTab, userId, tVAT, toastAlert]);
  console.log(activeTab, "activeTab");
  // VAT: preload on mount
  useEffect(() => {
    const preload = async () => {
      try {
        if (!userId) return;
        const response = await api.get(`/vat/update-info?userId=${userId}`);
        const resData = response?.data?.vatInfo ? response.data : response;
        if (resData?.success) {
          setVatInfo(resData.vatInfo);
        }
      } catch (_) {
        // silent
      }
    };
    preload();
  }, [userId]);

  // Update VAT info
  const handleVATUpdate = async (updateData) => {
    try {
      setVatUpdating(true);
      const response = await api.post("/vat/update-info", {
        userId,
        ...updateData,
      });
      const resData = response?.data?.user ? response.data : response;
      if (resData?.success) {
        setVatInfo(resData.user.vatInfo);
        Swal.fire({
          icon: "success",
          title: tVAT("ui.updateSuccessText"),
          timer: 3000,
          toast: true,
          position: "top-right",
          showConfirmButton: false,
        });
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: toastAlert("error"),
        text: tVAT("ui.updateError"),
      });
    } finally {
      setVatUpdating(false);
    }
  };

  const connectStripeAccount = async () => {
    try {
      const endpoint =
        role === "brand"
          ? "/payments/create-customer"
          : "/payments/create-ambassador-account";
      const response = await api.post(endpoint, { userId, email });

      if (response.data.success) {
        setUpdateMessage(
          role === "brand"
            ? "Stripe customer account created successfully"
            : "Stripe ambassador account created successfully",
        );
        setTimeout(() => setUpdateMessage(""), 3000);
      } else {
        throw new Error(
          response.data.error || "Failed to create Stripe account",
        );
      }
    } catch (error) {
      Swal.fire({
        title: toastAlert("error"),
        text: toastAlert("stripeAccountErrorText"),
        toast: true,
        icon: "error",
        showConfirmButton: false,
        position: "top-right",
        timer: 5000,
      });
      setUpdateMessage("Failed to create Stripe account");
      setTimeout(() => setUpdateMessage(""), 3000);
    }
  };

  const deleteCard = async (card) => {
    const result = await Swal.fire({
      title: toastAlert("sure"),
      text: toastAlert("deleteCardSuccessText"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: toastAlert("deleteCardSuccessConfirmButtonText"),
      cancelButtonText: toastAlert("deleteCardSuccessCancelButtonText"),

      customClass: {
        confirmButton: "confirmButton",
        cancelButton: "cancelButton",
      },
    });

    if (result.isConfirmed) {
      try {
        const response = await api.post("/payments/delete-payment-method", {
          userId,
          stripeCustomerId: stripeId,
          paymentMethodId: card?.paymentMethodId,
          cardId: card?._id,
        });

        if (response.data.data?.success) {
          // setCards(
          //   cards.filter(
          //     (c) => (c._id || c.id) !== (card._id || card.paymentMethodId)
          //   )
          // );
          setCard(null);

          setActiveTab("cards");
          Swal.fire({
            text: toastAlert("cardDeleteSuccess"),
            toast: true,
            position: "top-right",
            showConfirmButton: false,
            icon: "success",
            timer: 3000,
          });
        } else {
          throw new Error(
            response.data.error || "Failed to delete payment method",
          );
        }
      } catch (err) {
        const errorMessage =
          err.response?.data?.error || err.message || "Failed to delete card.";
        Swal.fire({
          title: toastAlert("error"),
          text: toastAlert("cardDeleteError"),
          toast: true,
          showConfirmButton: false,
          position: "top-right",
          icon: "error",
          timer: 5000,
        });
      }
    }
  };

  const generateInvoice = async () => {
    if (role !== "brand") return;
    try {
      setGenerating(true);
      // Use a wider window (last 30 days) to avoid empty-day analytics
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
      const existingInvoicesResponse = await api.post(
        "/payments/list-invoices-by-customer",
        {
          brandId: userId,
        },
      );
      let existingInvoices = [];
      if (existingInvoicesResponse.data?.success) {
        existingInvoices = existingInvoicesResponse.data.data || [];
      } else if (existingInvoicesResponse.data?.data?.success) {
        existingInvoices = existingInvoicesResponse.data.data.invoices || [];
      }

      const analyticsResponse = await api.get(
        `/analytics/brand?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
      );

      if (!analyticsResponse?.success) {
        throw new Error(
          analyticsResponse?.message || "Failed to fetch analytics data",
        );
      }

      const analytics = analyticsResponse.data;

      if (!analytics || analytics.length === 0) {
        throw new Error("No campaigns found for the selected period");
      }

      let invoicesGenerated = 0;
      let campaignsSkipped = 0;

      for (const campaign of analytics) {
        const campaignId = campaign.campaignId;

        // Build already invoiced amounts per athlete (in cents)
        const alreadyInvoicedByAthlete = {};
        existingInvoices.forEach((invoice) => {
          if (
            invoice.campaignId === campaignId &&
            Array.isArray(invoice.lineItems)
          ) {
            invoice.lineItems.forEach((item) => {
              const athleteId = item?.metadata?.athleteId;
              if (!athleteId) return;
              const amt = Number(item.amount) || 0;
              alreadyInvoicedByAthlete[athleteId] =
                (alreadyInvoicedByAthlete[athleteId] || 0) + amt;
            });
          }
        });

        const periodStart = startDate;
        const periodEnd = endDate;
        const currency = "eur";

        // Compute delta amounts per ambassador (current earnings - already invoiced)
        const lineItems = [];
        let ambassadorEarnings = 0; // in cents, for platform fee calc
        campaign.trafficByAmbassador.forEach((ambassador) => {
          const athleteId = ambassador.athleteId;
          const currentTotal = Math.round(
            Number(ambassador.ambassadorEarnings || 0) * 100,
          );
          const already = alreadyInvoicedByAthlete[athleteId] || 0;
          const delta = currentTotal - already;
          if (delta > 0) {
            ambassadorEarnings += delta;
            lineItems.push({
              description: `Earnings for ${ambassador.ambassadorName} (Campaign: ${campaign.campaignTitle})`,
              amount: delta,
              metadata: { athleteId },
            });
          }
        });

        // If no positive deltas, skip this campaign
        if (lineItems.length === 0) {
          campaignsSkipped++;
          continue;
        }

        // Calculate platform fee: 4% for pay-per-sale, 20% for other types
        const feeRate =
          campaign.compensationType === "pay-per-sale" ? 0.04 : 0.2;
        const platformFee = Math.round(ambassadorEarnings * feeRate);
        const totalAmount = ambassadorEarnings + platformFee;

        // Add platform fee
        lineItems.push({
          description: `Platform fee (Campaign: ${campaign.campaignTitle})`,
          amount: platformFee,
          metadata: { type: "platform_fee" },
        });

        const metrics = {
          clicks: campaign.totalClicks,
          conversions: campaign.totalConversions,
        };

        const response = await api.post("/payments/invoice", {
          brandId: userId,
          campaignId,
          periodStart,
          periodEnd,
          metrics,
          currency,
          lineItems,
          totalAmount,
        });

        if (!response.data.success) {
          throw new Error("Failed to generate invoice");
        }

        invoicesGenerated++;
      }

      let message = `Generated ${invoicesGenerated} invoice(s) successfully`;
      if (campaignsSkipped > 0) {
        message += ` (${campaignsSkipped} campaign(s) skipped - all athletes already invoiced)`;
      }

      Swal.fire({
        title: toastAlert("success"),
        toast: true,
        icon: "success",
        showConfirmButton: false,
        position: "top-right",
        timer: 3000,
      });

      await fetchInvoices();
    } catch (err) {
      const msg = err?.error || err?.message || "Failed to generate invoice";
      Swal.fire({
        title: toastAlert("error"),
        text: `${toastAlert("invoiceGenerateError")}\n${msg}`,
        toast: true,
        showConfirmButton: false,
        position: "top-right",
        icon: "error",
        timer: 5000,
      });
    } finally {
      setGenerating(false);
    }
  };
  // Place this above `const Payments = () => {`
  const VATStatusPreview = ({ displayVat, tVAT, t }) => {
    if (!displayVat) return null;
    return (
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
              {displayVat.registrationCountry || t("notSet")}
            </span>
          </div>
          <div>
            <span className="block text-sm font-medium text-gray-500">
              {tVAT("ui.vatNumber")}
            </span>
            <span className="text-gray-900">
              {displayVat.vatNumber || t("notProvided")}
            </span>
          </div>
          {!isEUCountry(displayVat.registrationCountry || "") && (
            <div>
              <span className="block text-sm font-medium text-gray-500">
                {tVAT("nonEu.registrationNumberLabel")}
              </span>
              <span className="text-gray-900">
                {displayVat.businessRegistrationNumber || t("notProvided")}
              </span>
            </div>
          )}
          <div>
            <span className="block text-sm font-medium text-gray-500">
              {tVAT("ui.vatStatus")}
            </span>
            <span
              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                displayVat.vatStatus === "valid"
                  ? "bg-green-100 text-green-800"
                  : displayVat.vatStatus === "invalid"
                    ? "bg-red-100 text-red-800"
                    : "bg-gray-100 text-gray-800"
              }`}
            >
              {displayVat.vatStatus || t("notProvided")}
            </span>
          </div>
        </div>
      </div>
    );
  };
  const payInvoice = async (stripeInvoiceId, paymentMethodId) => {
    setPayingInvoiceId(stripeInvoiceId);
    try {
      const response = await api.post("/payments/pay-invoice", {
        brandId: userId,
        customerId: stripeId,
        stripeInvoiceId,
        paymentMethodToken: paymentMethodId,
      });
      // axios interceptor returns response.data already
      if (response?.success) {
        const isProcessing = !!response?.processing;
        Swal.fire({
          // title: isProcessing ? toastAlert("processing") : toastAlert("success"),
          text:
            response?.message ||
            (isProcessing
              ? toastAlert("invoiceProcessingText")
              : toastAlert("invoiceSuccessText")),
          toast: true,
          showConfirmButton: false,
          position: "top-right",
          icon: isProcessing ? "info" : "success",
          timer: 3000,
        });
        await fetchInvoices();
      } else {
        throw new Error(response?.error || "Failed to pay invoice");
      }
    } catch (err) {
      Swal.fire({
        title: toastAlert("error"),
        toast: true,
        text: toastAlert("invoiceErrorText"),
        showConfirmButton: false,
        position: "top-right",
        icon: "error",
        timer: 5000,
      });
    } finally {
      setPayingInvoiceId(null);
    }
  };

  const downloadInvoice = async (invoiceId) => {
    try {
      const response = await api.get(`/payments/invoice/${invoiceId}/download`);
      window.location.href = response.data?.url;
    } catch (err) {
      Swal.fire({
        title: toastAlert("error"),
        toast: true,
        text: toastAlert("downloadInvoiceError"),
        showConfirmButton: false,
        position: "top-right",
        icon: "error",
        timer: 5000,
      });
    }
  };
  const t = useTranslations("Settings.payments");
  const formatAmount = (amount, currency) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);

  return (
    <div className="md:flex min-h-screen bg-gray-100">
      <SettingsSidebar role={role} />
      <div className="flex-1 px-3 py-6 pt-8 lg:p-6 lg:pt-10 w-full">
        <h2 className="text-2xl font-bold text-black mb-6">
          {t("paymentSettings")}
        </h2>
        {!userId || !role ? (
          <p className="text-red-600">{t("loading")}...</p>
        ) : (
          <>
            <p className="text-gray-600 mb-6">
              {t("stripeId")}: {stripeId || t("notConnected")}
            </p>

            {isStripeConnected && (
              <div className="bg-white shadow-sm p-6">
                <div className="flex border-b border-gray-200 mb-6">
                  <button
                    className={`px-4 py-2 text-sm font-medium ${
                      activeTab === "cards"
                        ? "border-b-2 border-[#f26915] text-[#f26915]"
                        : "text-gray-600 hover:text-[#f26915]"
                    }`}
                    onClick={() => setActiveTab("cards")}
                  >
                    {t("cards")}
                  </button>
                  {role === "brand" && (
                    <button
                      className={`px-4 py-2 text-sm font-medium ${
                        activeTab === "invoices"
                          ? "border-b-2 border-[#f26915] text-[#f26915]"
                          : "text-gray-600 hover:text-[#f26915]"
                      }`}
                      onClick={() => setActiveTab("invoices")}
                    >
                      {t("invoices")}
                    </button>
                  )}
                  <button
                    className={`px-4 py-2 text-sm font-medium ${
                      activeTab === "vat"
                        ? "border-b-2 border-[#f26915] text-[#f26915]"
                        : "text-gray-600 hover:text-[#f26915]"
                    }`}
                    onClick={() => {
                      setActiveTab("vat");
                    }}
                  >
                    {tVAT("title")}
                  </button>
                </div>

                {activeTab === "cards" && (
                  <div>
                    <h3 className="text-lg font-semibold text-black mb-4">
                      {t("savedCard")}
                    </h3>
                    {loading ? (
                      <p className="text-sm text-gray-600">
                        {t("loadingCard")}...
                      </p>
                    ) : card ? (
                      <CardList
                        card={card}
                        onDelete={deleteCard}
                        t={t}
                        canManage={canManageCards}
                      />
                    ) : (
                      <p className="text-sm text-gray-600">{t("fallback1")}</p>
                    )}
                    {!isVATReady && role === "brand" && !card && (
                      <p className="mt-3 text-sm text-red-600">
                        {tVAT("ui.updateBeforeCard") ||
                          "Please update your VAT information (VAT tab) before adding a card."}
                      </p>
                    )}
                    <div className="mt-6 max-w-md">
                      <Elements stripe={stripePromise}>
                        {canManageCards && !card && isVATReady && (
                          <AddCardForm
                            userId={userId}
                            stripeId={stripeId}
                            role={role}
                            onCardAdded={handleCardAdded}
                            hasCard={!!card}
                          />
                        )}
                      </Elements>
                    </div>
                  </div>
                )}

                {activeTab === "invoices" && role === "brand" && (
                  <div>
                    <h3 className="text-lg font-semibold text-black mb-4">
                      {t("invoices")}
                    </h3>
                    {invoicesLoading ? (
                      <p className="text-sm text-gray-600">
                        {t("loadingInvoices")}
                      </p>
                    ) : invoices.length > 0 ? (
                      <InvoiceList
                        invoices={invoices}
                        card={card}
                        onPay={payInvoice}
                        onDownload={downloadInvoice}
                        formatAmount={formatAmount}
                        payingInvoiceId={payingInvoiceId}
                      />
                    ) : (
                      <p className="text-sm text-gray-600">{t("fallback2")}</p>
                    )}
                    <Pagination
                      currentPage={invoicePagination.page}
                      pageCount={invoicePagination.totalPages}
                      onPageChange={handleInvoicePageChange}
                    />
                  </div>
                )}

                {activeTab === "vat" && (
                  <div className="max-w-3xl">
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold">{tVAT("title")}</h3>
                      <p className="mt-1 text-gray-600">
                        {tVAT("ui.manageDescBrand")}
                      </p>
                    </div>
                    {vatLoading || vatInfo === null ? (
                      <Loader />
                    ) : (
                      <>
                        <VATStatusPreview
                          displayVat={vatInfo}
                          tVAT={tVAT}
                          t={t}
                        />

                        <VATInformationForm
                          user={vatInfo}
                          onUpdate={handleVATUpdate}
                          hideBusinessTypeQuestion
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
            )}

            <div className="mt-6 space-y-4">
              {!isStripeConnected && (
                <button
                  className="w-full max-w-md primaryBtnPlain text-white py-2 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={connectStripeAccount}
                  disabled={isStripeConnected}
                >
                  {isStripeConnected ? t("stripe") : t("stripe2")}
                </button>
              )}
              {updateMessage && (
                <p
                  className={`text-sm ${
                    updateMessage.includes("successfully")
                      ? "text-[#3B0029]"
                      : "text-red-600"
                  }`}
                >
                  {updateMessage}
                </p>
              )}
              {role === "brand" && process.env.NODE_ENV === "development" && (
                <button
                  onClick={generateInvoice}
                  className="w-full max-w-md bg-[#f26915] text-white py-2 px-4 rounded-[50px] hover:bg-[#d65e13] disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!isStripeConnected || generating}
                >
                  {generating ? t("processing") : t("generateInvoices")}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Payments;
