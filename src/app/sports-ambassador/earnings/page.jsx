"use client";

import { memo, useEffect, useMemo, useState, useCallback } from "react";
import { FiDollarSign, FiRepeat, FiShare2, FiArrowUpRight, FiArrowDownRight, FiCalendar } from "react-icons/fi";
import { useTranslations } from "next-intl";
import api from "@/lib/axios";
import useCompensationTranslations from "@/hook/useCompensationTranslations";
import SidebarSports from "@/components/SidebarSports";
import Loader from "@/components/Loader";
import Pagination from "@/components/Pagination/pagination";

const EarningsPage = memo(function EarningsPage() {
  const t = useTranslations("Earnings");
  const translateCompensation = useCompensationTranslations();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default to 30 days for better overview
  );
  const [endDate, setEndDate] = useState(new Date());

  const formatAmount = useCallback((amount, currency = "EUR") => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    if (Number.isNaN(num)) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(num || 0);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/earnings/sports-ambassador", {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });
      if (!res?.success)
        throw new Error(
          res?.message ||
            (t
              ? t("fetchError", { default: "Failed to fetch earnings" })
              : "Failed to fetch earnings"),
        );
      setData(res.data);
    } catch (e) {
      setError(
        e.message ||
          (t
            ? t("fetchError", { default: "Failed to fetch earnings" })
            : "Failed to fetch earnings"),
      );
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, t]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    if (!data) return null;

    const campaigns = Array.isArray(data.campaigns) ? data.campaigns : [];

    const sum = (arr, pick) =>
      arr.reduce((acc, item) => {
        const n = Number(pick(item));
        return acc + (Number.isFinite(n) ? n : 0);
      }, 0);

    const earningsByCampaign = sum(
      campaigns,
      (c) => c?.financials?.ambassadorEarnings,
    );
    const conversionsByCampaign = sum(campaigns, (c) => c?.totalConversions);

    return {
      conversions:
        (Number.isFinite(Number(data.conversions)) && data.conversions) ||
        conversionsByCampaign ||
        0,
      shares: (Number.isFinite(Number(data.shares)) && data.shares) || 0,
      earnings: earningsByCampaign || data.earnings || 0,
      earningsByCampaign,
    };
  }, [data]);

  return (
    <div className="flex flex-col bg-[#F9FAFB] min-h-screen font-gothic">
      <div className="flex flex-1 relative">
        <div className="hidden lg:block h-fit">
          <SidebarSports />
        </div>

        <div className="flex-1 flex flex-col p-4 pt-8 md:p-8 md:pt-10 overflow-auto">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[#390a21]">
                {t ? t("title", { default: "Earnings Overview" }) : "Earnings Overview"}
              </h1>
              <p className="text-gray-500 mt-1">Track your performance and track your revenue</p>
            </div>
            
            <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
               <div className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600">
                  <FiCalendar className="text-[#f26915]" />
                  <span>Last 30 Days</span>
               </div>
            </div>
          </div>

          {loading && (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <Loader />
              <p className="text-gray-400 animate-pulse">Loading your financial data...</p>
            </div>
          )}
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                <span className="text-xl">⚠️</span>
              </div>
              <p className="font-medium">{error}</p>
            </div>
          )}

          {!loading && totals && data && (
            <>
              {/* Primary Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard
                  label={t ? t("totalEarnings", { default: "Total Earnings" }) : "Total Earnings"}
                  value={formatAmount(totals.earnings)}
                  icon={<FiDollarSign />}
                  trend="+12.5%" // Placeholder trend
                  color="purple"
                />
                <StatCard
                  label={t ? t("totalConversions", { default: "Total Conversions" }) : "Total Conversions"}
                  value={totals.conversions}
                  icon={<FiRepeat />}
                  trend="+5.2%"
                  color="orange"
                />
                <StatCard
                  label={t ? t("totalShares", { default: "Total Shares" }) : "Total Shares"}
                  value={totals.shares}
                  icon={<FiShare2 />}
                  trend="+8.1%"
                  color="green"
                />
              </div>


              {/* Earnings by Campaign Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-10">
                <div className="px-6 py-5 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                  <h2 className="font-bold text-lg text-[#390a21]">
                    {(t && t("byCampaign", { default: "Earnings by Campaign" })) || "Earnings by Campaign"}
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-black text-white">
                        <Th>Brand</Th>
                        <Th>Compensation</Th>
                        <Th className="text-center">Conversions</Th>
                        <Th className="text-right">Refund</Th>
                        <Th className="text-right">Earnings</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {data?.campaigns?.length ? (
                        data.campaigns.map((c) => (
                          <tr key={c.campaignId} className="hover:bg-gray-50/80 transition-colors">
                            <Td className="font-semibold text-gray-900">{c.brandCompany || c.campaignTitle}</Td>
                            <Td>
                              <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold uppercase tracking-wider">
                                {translateCompensation(c.compensationType)}
                              </span>
                            </Td>
                            <Td className="text-center font-medium">{c.totalConversions || 0}</Td>
                            <Td className="text-right text-red-500 font-medium">
                              {formatAmount(0)}
                            </Td>
                            <Td className="text-right font-bold text-green-600">
                              {formatAmount(c.financials?.ambassadorEarnings)}
                            </Td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-gray-400 italic">
                            No active campaigns found for this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Transaction History Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
                <div className="px-6 py-5 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                  <h2 className="font-bold text-lg text-[#390a21]">
                    {(t && t("history", { default: "Transaction History" })) || "Transaction History"}
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-black text-white">
                        <Th>Date</Th>
                        <Th>Brand</Th>
                        <Th>Event</Th>
                        <Th>Status</Th>
                        <Th className="text-right">Sale</Th>
                        <Th className="text-right">Refund</Th>
                        <Th className="text-right">Rate</Th>
                        <Th className="text-right">Earnings</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {data?.records?.length ? (
                        data.records.map((r, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                            <Td className="text-gray-500 text-xs font-medium uppercase tracking-tighter">
                              {r.date ? new Date(r.date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' }) : "-"}
                            </Td>
                            <Td className="font-semibold text-gray-800">{r.brandCompany || r.campaignTitle || "-"}</Td>
                            <Td>
                                <span className="text-xs font-bold px-2 py-0.5 border border-gray-200 rounded text-gray-500 uppercase">
                                    {r.eventName}
                                </span>
                            </Td>
                            <Td>
                              <StatusBadge status={r.commissionStatus} t={t} />
                            </Td>
                            <Td className="text-right font-bold text-blue-600/80">
                              {r.saleAmount > 0 ? formatAmount(r.saleAmount) : "—"}
                            </Td>
                            <Td className="text-right text-red-500/80 font-bold">
                              {r.refundAmount > 0 ? formatAmount(r.refundAmount) : "—"}
                            </Td>
                            <Td className="text-right text-gray-400 font-bold text-xs uppercase">
                              {r.commissionRate}%
                            </Td>
                            <Td className={`text-right font-black ${
                                r.commissionStatus === "cancelled" ? "text-gray-300 line-through" : 
                                r.entryType === "credit" ? "text-red-600" : "text-green-600"
                            }`}>
                              {r.commissionStatus === "cancelled" ? "" : r.entryType === "credit" ? "-" : "+"}
                              {formatAmount(Math.abs(r.amount))}
                            </Td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-gray-400 italic">
                            No transactions recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

const StatusBadge = memo(function StatusBadge({ status, t }) {
  const configs = {
    pending: "bg-amber-50 text-amber-700 border-amber-100",
    locked: "bg-blue-50 text-blue-700 border-blue-100",
    cancelled: "bg-rose-50 text-rose-700 border-rose-100",
    paid: "bg-emerald-50 text-emerald-700 border-emerald-100",
    upcoming: "bg-slate-50 text-slate-700 border-slate-100",
  };

  const label = t ? t(`statuses.${status}`, { default: status }) : status;

  return (
    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${configs[status] || configs.upcoming}`}>
      {label}
    </span>
  );
});

const StatCard = memo(function StatCard({ label, value, icon, trend, color }) {
  const colors = {
    purple: { bg: "bg-purple-50", icon: "bg-[#390a21] text-white", text: "text-[#390a21]", border: "border-purple-100" },
    orange: { bg: "bg-orange-50", icon: "bg-[#f26915] text-white", text: "text-[#f26915]", border: "border-orange-100" },
    green: { bg: "bg-emerald-50", icon: "bg-emerald-600 text-white", text: "text-emerald-600", border: "border-emerald-100" },
  };
  
  const c = colors[color] || colors.purple;

  return (
    <div className={`bg-white border ${c.border} rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group overflow-hidden relative`}>
      <div className={`absolute top-0 right-0 w-24 h-24 ${c.bg} rounded-bl-full -mr-10 -mt-10 opacity-30 group-hover:scale-110 transition-transform`}></div>
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-1">{label}</p>
          <div className={`text-3xl font-black ${c.text}`}>{value}</div>
          {trend && (
            <div className="mt-2 flex items-center gap-1">
               <FiArrowUpRight className="text-emerald-500 font-bold" />
               <span className="text-emerald-500 text-xs font-black">{trend}</span>
               <span className="text-gray-300 text-[10px] font-bold uppercase">vs last month</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-inner ${c.icon}`}>
          {icon}
        </div>
      </div>
    </div>
  );
});

const MiniStatCard = memo(function MiniStatCard({ label, value, type }) {
    const styles = {
        positive: "text-emerald-600",
        negative: "text-rose-600",
        neutral: "text-gray-900"
    };

    return (
        <div className="bg-white px-6 py-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <span className="text-gray-500 text-xs font-bold uppercase tracking-wide">{label}</span>
            <span className={`text-lg font-black ${styles[type]}`}>{value}</span>
        </div>
    );
});

function Th({ children, className = "" }) {
  return (
    <th className={`px-6 py-4 font-black text-[10px] uppercase tracking-[0.2em] border-b border-white/10 ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = "" }) {
  return <td className={`px-6 py-4 text-sm ${className}`}>{children}</td>;
}

export default EarningsPage;
