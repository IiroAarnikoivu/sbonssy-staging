"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Chart } from "react-google-charts";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import { useTranslations } from "next-intl";
import Sidebar from "./Sidebar";
import { FiDollarSign, FiClock, FiCalendar, FiArrowUpRight, FiDownload, FiRefreshCw } from "react-icons/fi";
import Pagination from "./Pagination/pagination";

export default function BrandPayments() {
  const { user, loading } = useAuthStore();
  const t = useTranslations("Payments");
  const [page, setPage] = useState(1);
  const limit = 10;
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const brandId = user?.onboardedDetails?._id || user?.id || null;

  const fetchData = async () => {
    if (!brandId) return;
    setBusy(true);
    setError("");
    try {
      const res = await api.get(
        `/payments/brand`, {
          params: {
            brandId,
            page,
            limit
          }
        }
      );
      if (!res?.success) throw new Error(res?.error || "Failed to fetch");
      setData(res.data);
    } catch (e) {
      setError(e?.error || e?.message || "Failed to load payments");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!loading && brandId) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, brandId, page]);

  const summary = data?.summary || {
    totalPaid: 0,
    pendingPayments: 0,
    upcomingPayment: 0,
  };
  const paymentsByCampaign = data?.breakdowns?.paymentsByCampaign || [];
  const paymentsOverTime = data?.breakdowns?.paymentsOverTime || [];
  const records = data?.records || [];

  const campaignChart = useMemo(() => {
    const rows = paymentsByCampaign.map((r) => [
      r.campaignTitle || r.campaignId,
      r.amount,
    ]);
    return [["Campaign", "Amount"], ...rows];
  }, [paymentsByCampaign]);

  const timeChart = useMemo(() => {
    const rows = paymentsOverTime.map((r) => [r.period, r.amount]);
    return [["Period", "Amount"], ...rows];
  }, [paymentsOverTime]);

  const formatCurrency = (n) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "EUR",
    }).format(n || 0);


  const exportCSV = () => {
    const header = [
      "Date",
      "Affiliate Name",
      "Campaign Name",
      "Tracking Code",
      "Sale Amount",
      "Commission Paid",
      "Commission Status",
      "Invoice Status",
    ];
    const body = records.map((r) => [
      new Date(r.date).toISOString().slice(0, 10),
      r.affiliateName || "—",
      r.campaignTitle ||
        paymentsByCampaign.find((c) => c.campaignId === String(r.campaignId))
          ?.campaignTitle ||
        String(r.campaignId || ""),
      r.campaignTrackingId || "",
      r.saleAmount,
      r.commissionPaid,
      r.commissionStatus,
      r.status,
    ]);
    const csv = [header, ...body]
      .map((row) =>
        row
          .map((v) =>
            typeof v === "string" ? `"${v.replace(/"/g, '""')}"` : v
          )
          .join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "brand-payments.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex bg-[#F9FAFB] min-h-screen font-gothic overflow-hidden">
      <div className="hidden lg:block h-screen sticky top-0">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col h-screen overflow-y-auto p-4 pt-8 md:p-8 md:pt-10">
        <div className="mx-auto w-full max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-black text-[#390a21] uppercase tracking-tight">
                {t("heading")}
              </h1>
              <p className="text-gray-500 text-sm font-medium">Manage and track your affiliate commissions</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-700 text-sm font-bold shadow-sm hover:shadow-md transition-all active:scale-95"
                onClick={exportCSV}
                disabled={!records.length}
              >
                <FiDownload className="text-[#f26915]" />
                {t("csv")}
              </button>
              <button
                className="flex items-center gap-2 px-4 py-2 bg-[#f26915] rounded-xl text-white text-sm font-bold shadow-lg shadow-orange-200 hover:shadow-orange-300 transition-all active:scale-95 disabled:opacity-50"
                onClick={fetchData}
                disabled={busy || !brandId}
              >
                <FiRefreshCw className={`text-white ${busy ? 'animate-spin' : ''}`} />
                {busy ? t("loading") : t("refresh")}
              </button>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-8 flex flex-col md:flex-row items-center gap-6">
            <div className="flex items-center gap-4">
              <p className="text-gray-500 text-sm font-medium">Viewing all-time commission data and payments.</p>
            </div>
          </div>

            {error && (
              <div className="p-3 mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded">
                {error}
              </div>
            )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard 
              label={t("total")} 
              value={formatCurrency(summary.totalPaid)} 
              icon={<FiDollarSign />} 
              color="green" 
            />
            <StatCard 
              label={t("pending")} 
              value={formatCurrency(summary.pendingPayments)} 
              icon={<FiClock />} 
              color="orange" 
            />
            <StatCard 
              label={t("upcoming")} 
              value={formatCurrency(summary.upcomingPayment)} 
              icon={<FiCalendar />} 
              color="purple" 
            />
          </div>

          <div className="mb-8 p-4 rounded-2xl bg-amber-50 text-amber-900 text-sm border border-amber-100 flex items-start gap-3">
             <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shrink-0 mt-0.5 font-bold">!</div>
             <div>
                <p className="font-bold mb-1">{t("text")}</p>
                <p className="opacity-80">{t("text2")}</p>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="text-xs font-black uppercase tracking-widest text-[#390a21] mb-6 flex items-center gap-2">
                <div className="w-2 h-4 bg-[#f26915] rounded-full"></div>
                {t("payments")}
              </div>
              {campaignChart.length > 1 ? (
                <Chart
                  chartType="BarChart"
                  data={campaignChart}
                  width="100%"
                  height="300px"
                  options={{ 
                    legend: { position: "none" },
                    colors: ['#390a21'],
                    chartArea: { width: '80%', height: '80%' }
                  }}
                />
              ) : (
                <div className="h-[300px] flex items-center justify-center text-sm text-gray-400 font-medium italic bg-gray-50 rounded-xl">{t("fallback")}</div>
              )}
            </div>
            <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="text-xs font-black uppercase tracking-widest text-[#390a21] mb-6 flex items-center gap-2">
                <div className="w-2 h-4 bg-[#f26915] rounded-full"></div>
                {t("paymentsOverTime")}
              </div>
              {timeChart.length > 1 ? (
                <Chart
                  chartType="LineChart"
                  data={timeChart}
                  width="100%"
                  height="300px"
                  options={{ 
                    legend: { position: "none" },
                    colors: ['#f26915'],
                    chartArea: { width: '80%', height: '80%' },
                    curveType: 'function'
                  }}
                />
              ) : (
                <div className="h-[300px] flex items-center justify-center text-sm text-gray-400 font-medium italic bg-gray-50 rounded-xl">{t("fallback")}</div>
              )}
            </div>
          </div>

          <div className="p-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-8">
            <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
              <div className="text-xs font-black uppercase tracking-widest text-[#390a21] flex items-center gap-2">
                <div className="w-2 h-4 bg-[#f26915] rounded-full"></div>
                {t("records")}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-[#390a21] text-white">
                    <Th>{t("date")}</Th>
                    <Th>{t("name")}</Th>
                    <Th>Campaign</Th>
                    <Th>Sale Amount</Th>
                    <Th>Refund</Th>
                    <Th>Rate</Th>
                    <Th>Payable</Th>
                    <Th>Status</Th>
                    <Th>Comm. Status</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {records.length === 0 && (
                      <tr>
                        <td colSpan={10} className="py-4 text-gray-500">
                          {t("fallback2")}
                        </td>
                      </tr>
                    )}
                    {records.map((r, i) => {
                      const campaignTitle =
                        r.campaignTitle ||
                        paymentsByCampaign.find(
                          (c) => c.campaignId === String(r.campaignId)
                        )?.campaignTitle ||
                        String(r.campaignId || "");
                      return (
                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                          <Td className="text-gray-400 font-bold tabular-nums whitespace-nowrap">
                            {new Date(r.date).toLocaleDateString()}
                          </Td>
                          <Td className="font-bold text-[#390a21]">
                             <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-[#390a21] text-xs">
                                  {r.affiliateName?.charAt(0) || "-"}
                                </div>
                                <span>{r.affiliateName || "—"}</span>
                             </div>
                          </Td>
                          <Td>
                             <div className="flex flex-col">
                                <span className="text-blue-600 font-bold">{campaignTitle}</span>
                                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">{r.campaignTrackingId}</span>
                             </div>
                          </Td>
                          <Td className="font-bold text-blue-700 tabular-nums whitespace-nowrap">
                            {formatCurrency(r.customerSaleAmount || 0)}
                          </Td>
                          <Td className="font-bold text-rose-500 tabular-nums whitespace-nowrap">
                            {r.refundAmount > 0 ? `-${formatCurrency(r.refundAmount)}` : "—"}
                          </Td>
                          <Td className="font-bold text-gray-400 underline decoration-dotted">
                            {r.commissionRate}%
                          </Td>
                          <Td className={`font-black tabular-nums whitespace-nowrap ${r.saleAmount > 0 ? "text-emerald-600" : "text-gray-300"}`}>
                            {r.saleAmount > 0 ? "+" : ""}{formatCurrency(r.saleAmount)}
                          </Td>
                          <Td>
                             <span className="text-xs font-bold capitalize text-gray-600 bg-gray-100 px-2 py-1 rounded-md">{r.status}</span>
                          </Td>
                          <Td>
                            <StatusBadge status={r.commissionStatus} t={t} />
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {data?.pagination?.totalPages > 1 && (
              <div className="mb-12">
                <Pagination 
                  currentPage={page} 
                  pageCount={data.pagination.totalPages} 
                  onPageChange={(newPage) => {
                    setPage(newPage);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }} 
                />
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, trend, color }) {
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
}

function Th({ children, className = "" }) {
    return (
      <th className={`px-6 py-4 font-black text-[10px] uppercase tracking-[0.2em] text-left ${className}`}>
        {children}
      </th>
    );
}
  
function Td({ children, className = "" }) {
    return <td className={`px-6 py-4 text-sm ${className}`}>{children}</td>;
}

function StatusBadge({ status, t }) {
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
}
