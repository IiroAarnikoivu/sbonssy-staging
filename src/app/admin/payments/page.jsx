"use client";

import Loader from "@/components/Common/Loader/page";
import Pagination from "@/components/Pagination/pagination";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";

const Payments = () => {
  const { user } = useAuthStore();
  const router = useRouter();
  const adminId = user?.onboardedDetails?._id;
  const role = user?.onboardedDetails?.role;
  const toastAlert = useTranslations("Sweetalert");
  const t = useTranslations("Admin.payments");

  // Transaction history state
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Payout stats state
  const [payoutStats, setPayoutStats] = useState(null);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [triggeringPayout, setTriggeringPayout] = useState(false);

  // Ambassador balances state
  const [ambassadors, setAmbassadors] = useState([]);
  const [ambassadorsLoading, setAmbassadorsLoading] = useState(false);
  const [transferringId, setTransferringId] = useState(null);

  // Transfer/Payout history state
  const [payoutHistory, setPayoutHistory] = useState([]);
  const [payoutHistoryLoading, setPayoutHistoryLoading] = useState(false);
  const [payoutHistoryPagination, setPayoutHistoryPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Active tab state
  const [activeTab, setActiveTab] = useState("ambassadors"); // "ambassadors", "transactions", "transferHistory"

  // Fetch transactions
  const getAllPayments = async (page = 1) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        page: page.toString(),
      });
      const resp = await api.get(
        `/payments/list-transactions?${params.toString()}`,
      );

      // Handle double-wrapped response: resp.data contains { success, data, pagination }
      const responseData = resp?.data || resp;

      if (responseData?.success || responseData?.data) {
        setTransactions(responseData.data || []);
        if (responseData.pagination) {
          setPagination(responseData.pagination);
        }
      } else {
        console.error("Unexpected response format:", resp);
        setError("Unexpected response format");
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      const errorMessage =
        typeof error === "string"
          ? error
          : error?.error || error?.message || "Failed to fetch transactions";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Fetch payout stats
  const fetchPayoutStats = async () => {
    setPayoutLoading(true);
    try {
      const resp = await api.get("/admin/trigger-payouts");
      const responseData = resp?.data || resp;
      if (responseData?.success) {
        setPayoutStats(responseData);
      } else {
        console.error("Payout stats response not successful:", resp);
        setPayoutStats(null);
      }
    } catch (error) {
      console.error("Error fetching payout stats:", error);
      setPayoutStats(null);
    } finally {
      setPayoutLoading(false);
    }
  };

  // Fetch ambassador balances
  const fetchAmbassadorBalances = async () => {
    setAmbassadorsLoading(true);
    try {
      const resp = await api.get("/admin/ambassador-balances");
      const responseData = resp?.data || resp;
      if (responseData?.success) {
        setAmbassadors(responseData.ambassadors || []);
      } else {
        console.error("Failed to fetch ambassador balances:", resp);
      }
    } catch (error) {
      console.error("Error fetching ambassador balances:", error);
    } finally {
      setAmbassadorsLoading(false);
    }
  };

  // Fetch payout/transfer history
  const fetchPayoutHistory = async (page = 1) => {
    setPayoutHistoryLoading(true);
    try {
      const params = new URLSearchParams({
        limit: payoutHistoryPagination.limit.toString(),
        page: page.toString(),
      });
      const resp = await api.get(`/admin/payout-history?${params.toString()}`);
      const responseData = resp?.data || resp;
      if (responseData?.success) {
        setPayoutHistory(responseData.payouts || []);
        if (responseData.pagination) {
          setPayoutHistoryPagination(responseData.pagination);
        }
      } else {
        console.error("Failed to fetch payout history:", resp);
      }
    } catch (error) {
      console.error("Error fetching payout history:", error);
    } finally {
      setPayoutHistoryLoading(false);
    }
  };

  // Transfer to single ambassador
  const transferToAmbassador = async (ambassador) => {
    const result = await Swal.fire({
      title: "Confirm Transfer",
      html: `
        <p>Transfer <strong>${ambassador.balanceFormatted}</strong> to:</p>
        <p class="font-semibold">${ambassador.name || ambassador.email}</p>
        <p class="text-sm text-gray-500">${ambassador.email}</p>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Transfer",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#10B981",
    });

    if (!result.isConfirmed) return;

    setTransferringId(ambassador._id);
    try {
      const resp = await api.post("/admin/transfer-to-ambassador", {
        ambassadorId: ambassador._id,
      });

      const responseData = resp?.data || resp;
      if (responseData?.success) {
        Swal.fire({
          title: "Transfer Successful!",
          html: `
            
            <p>Transfer ID: ${responseData.details?.transferId?.substring(0, 20)}...</p>
            <p>Status: ${responseData.details?.status}</p>
          `,
          icon: "success",
        });
        // Refresh data
        fetchAmbassadorBalances();
        fetchPayoutStats();
      } else {
        throw new Error(
          responseData?.error || resp?.error || "Transfer failed",
        );
      }
    } catch (error) {
      console.error("Error transferring to ambassador:", error);
      Swal.fire({
        title: "Transfer Failed",
        text: error.error || error.message || "Failed to process transfer",
        icon: "error",
      });
    } finally {
      setTransferringId(null);
    }
  };

  // Trigger all eligible payouts
  const triggerPayouts = async () => {
    const result = await Swal.fire({
      title: "Trigger All Payouts",
      html: `
        <p>This will process payouts for <strong>${payoutStats?.stats?.eligibleForPayout || 0}</strong> ambassadors with balance ≥ €50.</p>
        <p class="mt-2">Total amount: <strong>${payoutStats?.stats?.eligibleBalanceFormatted || "€0.00"}</strong></p>
      `,
      icon: "info",
      showCancelButton: true,
      confirmButtonText: "Trigger Payouts",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#3085d6",
    });

    if (!result.isConfirmed) return;

    setTriggeringPayout(true);
    try {
      const resp = await api.post("/admin/trigger-payouts");

      const responseData = resp?.data || resp;
      if (responseData?.success) {
        Swal.fire({
          title: "Payouts Completed!",
          html: `
            <p><strong>${responseData.result?.successfulPayouts || 0}</strong> payouts processed</p>
            <p>Total paid: <strong>${responseData.result?.totalPaidOut || "€0.00"}</strong></p>
            <p>Failed: ${responseData.result?.failedPayouts || 0}</p>
            <p>Skipped (below threshold): ${responseData.result?.skippedBelowThreshold || 0}</p>
          `,
          icon: "success",
        });
        fetchPayoutStats();
        fetchAmbassadorBalances();
        getAllPayments();
      } else {
        throw new Error(
          responseData?.error || resp?.error || "Payout trigger failed",
        );
      }
    } catch (error) {
      console.error("Error triggering payouts:", error);
      Swal.fire({
        title: "Error",
        text: error.error || error.message || "Failed to trigger payouts",
        icon: "error",
      });
    } finally {
      setTriggeringPayout(false);
    }
  };

  // Fetch data on mount
  useEffect(() => {
    if (adminId && role) {
      getAllPayments();
      if (role === "admin") {
        fetchPayoutStats();
        fetchAmbassadorBalances();
        fetchPayoutHistory();
      }
    }
  }, [adminId, role]);

  // Handle page change for transactions
  const handlePageChange = (page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      getAllPayments(page);
    }
  };

  // Handle page change for payout history
  const handlePayoutHistoryPageChange = (page) => {
    if (page >= 1 && page <= payoutHistoryPagination.totalPages) {
      fetchPayoutHistory(page);
    }
  };

  // Format amount in cents to currency
  const formatAmount = (amount, currency = "eur") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: (currency || "eur").toUpperCase(),
    }).format(amount / 100);
  };

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="w-full h-full bg-white p-4 md:p-6 flex flex-col gap-6">
      <h2 className="text-lg font-semibold">{t("heading")}</h2>

      {/* Payout Stats Card - Admin Only */}
      {role === "admin" && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {t("payouts")}
              </h3>
              {payoutLoading ? (
                <p className="text-sm text-gray-600">{t("statsLoad")}</p>
              ) : payoutStats ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">{t("eligible")}</p>
                    <p className="text-xl font-bold text-green-600">
                      {payoutStats.stats?.eligibleForPayout || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">{t("threshold")}</p>
                    <p className="text-xl font-bold text-orange-500">
                      {payoutStats.stats?.belowThreshold || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">{t("eligibleAmount")}</p>
                    <p className="text-xl font-bold text-blue-600">
                      {payoutStats.stats?.eligibleBalanceFormatted || "€0.00"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">{t("total")}</p>
                    <p className="text-xl font-bold text-gray-700">
                      {payoutStats.stats?.totalBalanceFormatted || "€0.00"}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600">{t("fallbacktext")}</p>
              )}
            </div>
            {process.env.NODE_ENV == "development" && (
              <div className="flex flex-col gap-2">
                <button
                  onClick={triggerPayouts}
                  disabled={
                    triggeringPayout || !payoutStats?.stats?.eligibleForPayout
                  }
                  className={`px-6 py-3 rounded-lg font-semibold text-white ${
                    triggeringPayout || !payoutStats?.stats?.eligibleForPayout
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-green-500 hover:bg-green-600"
                  }`}
                >
                  {triggeringPayout ? t("processing") : t("trigger")}
                </button>
                <button
                  onClick={() => {
                    fetchPayoutStats();
                    fetchAmbassadorBalances();
                  }}
                  disabled={payoutLoading}
                  className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  ↻ {t("refresh")}
                </button>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-4">{t("text")}</p>
        </div>
      )}

      {/* Tabs */}
      {role === "admin" && (
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab("ambassadors")}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === "ambassadors"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t("ambBal")} ({ambassadors.length})
          </button>
          <button
            onClick={() => setActiveTab("transferHistory")}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === "transferHistory"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t("transferHistory")} ({payoutHistoryPagination.total})
          </button>
          <button
            onClick={() => setActiveTab("transactions")}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === "transactions"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t("invoicePayments")}
          </button>
        </div>
      )}

      {/* Ambassador Balances Tab */}
      {role === "admin" && activeTab === "ambassadors" && (
        <div className="flex-1 flex flex-col min-h-0">
          {ambassadorsLoading ? (
            <div className="text-sm text-gray-600">
              <Loader />
            </div>
          ) : ambassadors.length > 0 ? (
            <div className="overflow-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">
                      {t("ambassador")}
                    </th>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">
                      {t("role")}
                    </th>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">
                      {t("balance")}
                    </th>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">
                      {t("status")}
                    </th>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">
                      {t("account")}
                    </th>
                    {process.env.NODE_ENV == "development" && (
                      <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">
                        {t("action")}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {ambassadors.map((ambassador) => (
                    <tr key={ambassador._id} className="hover:bg-gray-50">
                      <td className="py-2 px-4 border-b">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {ambassador.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {ambassador.email}
                          </p>
                        </div>
                      </td>
                      <td className="py-2 px-4 border-b text-sm text-gray-900 capitalize">
                        {ambassador.subRole || ambassador.roleType}
                      </td>
                      <td className="py-2 px-4 border-b">
                        <p
                          className={`text-sm font-semibold ${ambassador.isEligible ? "text-green-600" : "text-orange-500"}`}
                        >
                          {ambassador.balanceFormatted}
                        </p>
                        {!ambassador.isEligible && (
                          <p className="text-xs text-gray-500">
                            {t("need")}{" "}
                            {ambassador.remainingToThresholdFormatted}{" "}
                            {t("more")}
                          </p>
                        )}
                      </td>
                      <td className="py-2 px-4 border-b">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            ambassador.isEligible
                              ? "bg-green-100 text-green-800"
                              : "bg-orange-100 text-orange-800"
                          }`}
                        >
                          {ambassador.isEligible ? t("eligible2") : t("below")}
                        </span>
                      </td>
                      <td className="py-2 px-4 border-b text-sm">
                        {ambassador.hasStripeAccount ? (
                          <span className="text-green-600">
                            ✓ {t("connected")}
                          </span>
                        ) : (
                          <span className="text-red-500">
                            ✗ {t("notConnected")}
                          </span>
                        )}
                      </td>
                      {process.env.NODE_ENV === "development" && (
                        <td className="py-2 px-4 border-b">
                          <button
                            onClick={() => transferToAmbassador(ambassador)}
                            disabled={
                              !ambassador.isEligible ||
                              !ambassador.hasStripeAccount ||
                              transferringId === ambassador._id
                            }
                            className={`px-3 py-1.5 rounded text-sm font-medium ${
                              !ambassador.isEligible ||
                              !ambassador.hasStripeAccount
                                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                : transferringId === ambassador._id
                                  ? "bg-blue-300 text-white cursor-wait"
                                  : "bg-blue-500 hover:bg-blue-600 text-white"
                            }`}
                          >
                            {transferringId === ambassador._id
                              ? t("transferring")
                              : t("transfer")}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>{t("noPayout")}</p>
            </div>
          )}
        </div>
      )}

      {/* Transfer History Tab */}
      {role === "admin" && activeTab === "transferHistory" && (
        <div className="flex-1 flex flex-col min-h-0">
          {payoutHistoryLoading ? (
            <div className="text-sm text-gray-600">
              <Loader />
            </div>
          ) : payoutHistory.length > 0 ? (
            <>
              <div className="overflow-auto">
                <table className="min-w-full bg-white border border-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">
                        {t("ambassador")}
                      </th>
                      <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">
                        {t("amount")}
                      </th>
                      <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">
                        {t("status")}
                      </th>
                      <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700 hidden md:table-cell">
                        {t("tranferId")}
                      </th>
                      <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700 hidden lg:table-cell">
                        {t("period")}
                      </th>
                      <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">
                        {t("date")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {payoutHistory.map((payout) => (
                      <tr key={payout._id} className="hover:bg-gray-50">
                        <td className="py-2 px-4 border-b">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {payout.ambassadorName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {payout.ambassadorEmail}
                            </p>
                          </div>
                        </td>
                        <td className="py-2 px-4 border-b">
                          <p className="text-sm font-semibold text-green-600">
                            {payout.amountFormatted}
                          </p>
                        </td>
                        <td className="py-2 px-4 border-b">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              payout.status === "paid"
                                ? "bg-green-100 text-green-800"
                                : payout.status === "transferred"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {payout.status}
                          </span>
                        </td>
                        <td className="py-2 px-4 border-b text-sm text-gray-600 hidden md:table-cell">
                          {payout.stripeTransferId?.substring(0, 20)}...
                        </td>
                        <td className="py-2 px-4 border-b text-sm text-gray-600 hidden lg:table-cell">
                          {payout.period || "-"}
                        </td>
                        <td className="py-2 px-4 border-b text-sm text-gray-600">
                          {formatDate(payout.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={payoutHistoryPagination.page}
                pageCount={payoutHistoryPagination.totalPages}
                onPageChange={handlePayoutHistoryPageChange}
              />
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>{t("noTranfer")}</p>
            </div>
          )}
        </div>
      )}

      {/* Invoice Payments Tab */}
      {(activeTab === "transactions" || role !== "admin") && (
        <div className="flex-1 flex flex-col min-h-0">
          <h3 className="text-md font-semibold mb-3 text-gray-700">
            {t("history")}
          </h3>

          {loading ? (
            <div className="text-sm text-gray-600">
              <Loader />
            </div>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : transactions.length > 0 ? (
            <>
              <div className="flex-1 min-h-0 overflow-auto">
                <table className="min-w-full bg-white border border-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">
                        {t("transaction")}
                      </th>
                      <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">
                        {t("amount")}
                      </th>
                      <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">
                        {t("status")}
                      </th>
                      <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700 hidden md:table-cell">
                        {t("invoice")}
                      </th>
                      <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700 hidden lg:table-cell">
                        {t("customer")}
                      </th>
                      <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">
                        {t("createdAt")}
                      </th>
                      <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">
                        {t("ambassador")}
                      </th>
                      <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">
                        {t("credit")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => (
                      <tr
                        key={transaction.transactionId}
                        className="hover:bg-gray-50"
                      >
                        <td className="py-2 px-4 border-b text-sm text-gray-900">
                          {transaction.transactionId?.substring(0, 20)}...
                        </td>
                        <td className="py-2 px-4 border-b text-sm text-gray-900">
                          {formatAmount(
                            transaction.amount,
                            transaction.currency,
                          )}
                        </td>
                        <td className="py-2 px-4 border-b text-sm">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              transaction.status === "succeeded"
                                ? "bg-green-100 text-green-800"
                                : transaction.status === "processing"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {transaction.status}
                          </span>
                        </td>
                        <td className="py-2 px-4 border-b text-sm text-gray-900 hidden md:table-cell">
                          {transaction.invoiceId?.substring(0, 15)}...
                        </td>
                        <td className="py-2 px-4 border-b text-sm text-gray-900 hidden lg:table-cell">
                          {transaction.customerId?.substring(0, 15)}...
                        </td>
                        <td className="py-2 px-4 border-b text-sm text-gray-900">
                          {formatDate(transaction.createdAt)}
                        </td>
                        <td className="py-2 px-4 border-b text-sm">
                          {transaction.ambassadorName &&
                          transaction.ambassadorName !== "N/A" ? (
                            <div>
                              <p className="font-medium text-gray-900">
                                {transaction.ambassadorName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {transaction.ambassadorEmail}
                              </p>
                            </div>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="py-2 px-4 border-b text-sm">
                          {transaction.isCredited ? (
                            <span className="text-green-600">
                              ✓ {t("credited")}
                            </span>
                          ) : transaction.status === "succeeded" ? (
                            <span
                              className="text-orange-500"
                              title="Payment succeeded but not yet credited to balance"
                            >
                              ⚠ {t("pending")}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={pagination.page}
                pageCount={pagination.totalPages}
                onPageChange={handlePageChange}
              />
            </>
          ) : (
            <p className="text-sm text-gray-600">{t("fallback")}</p>
          )}
        </div>
      )}

      {/* Info Banner */}
      {/* <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <strong>How it works:</strong>
        <ul className="list-disc ml-5 mt-2 space-y-1">
          <li>When a brand pays an invoice, the ambassador&apos;s commission is credited to their internal balance</li>
          <li>Balances accumulate over time until they reach the €50 threshold</li>
          <li>Payouts are processed on the 15th of each month (or manually via &quot;Trigger All Payouts&quot; or individual &quot;Transfer&quot; buttons)</li>
          <li>Only ambassadors with balance ≥ €50 can receive payouts</li>
          <li>After payout, the balance is reset to €0</li>
        </ul>
      </div> */}
    </div>
  );
};

export default Payments;
