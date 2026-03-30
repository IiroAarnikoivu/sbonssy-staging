"use client";

import React, { useEffect, useState, useMemo } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Loader from "./Loader";
import { Chart } from "react-google-charts";
import SidebarSports from "./SidebarSports";
import { useTranslations } from "next-intl";
import Sidebar from "./Sidebar";
import { 
  FiDollarSign, 
  FiMousePointer, 
  FiUsers, 
  FiTrendingUp, 
  FiPieChart, 
  FiCalendar, 
  FiFilter,
  FiArrowUpRight,
  FiBarChart2,
  FiTarget,
  FiActivity
} from "react-icons/fi";

const AnalyticsDashboard = ({ role }) => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [overview, setOverview] = useState(null); // brand overview metrics
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Initialize on client to avoid SSR/client time mismatch
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [selectedCompensationType, setSelectedCompensationType] =
    useState("all");
  const t = useTranslations("Analytics");

  // ------- Formatting helpers -------
  const fmtNumber = (v) =>
    new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
      Number(v || 0)
    );
  const fmtCurrency = (v) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(v || 0));
  const fmtMaybePercent = (v) => {
    if (v === null || v === undefined) return "0%";
    const num = Number(v);
    if (!isFinite(num) || num === 0) return "0%";
    // If value looks like a ratio (<=1), convert to percent
    const pct = num <= 1 ? num * 100 : num;
    return pct < 0.1 ? `${pct.toFixed(2)}%` : `${pct.toFixed(1)}%`;
  };
  const fmtRatio = (v) => {
    // Preserve the precision provided by the API; do not round
    if (v === null || v === undefined) return "0x";
    const num = Number(v);
    if (!isFinite(num)) return `${String(v)}x`;
    return `${String(v)}x`;
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const url =
        role === "brand"
          ? `/api/analytics/brand?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
          : `/api/analytics/sports-ambassador?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
      const response = await fetch(url, {
        headers: { "Content-Type": "application/json" },
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Failed to fetch analytics");
      }
      // Brand returns { data: [...], overview }, Ambassador returns { data: { ... } }
      if (role === "brand") {
        setAnalyticsData(Array.isArray(result.data) ? result.data : []);
        const ov = result.overview || null;
        if (ov) {
          // Normalize clicks so UI shows proper total even if API uses different key
          setOverview({
            ...ov,
            clicks: ov.clicks ?? ov.totalClicks ?? ov.click_count ?? 0,
          });
        } else {
          setOverview(null);
        }
      } else {
        setAnalyticsData(result.data);
        setOverview(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch analytics data based on role and date range
  useEffect(() => {
    // Set initial dates on client only
    if (!startDate || !endDate) {
      setStartDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
      setEndDate(new Date());
      return; // wait for dates before fetching
    }

    // Only fetch when dates are ready
    if (startDate && endDate) {
      fetchAnalytics();
    }
  }, [role, startDate, endDate]);

  // --- XLSX Export Handlers (server-side) ---
  const onExportBrandXlsx = () => {
    if (!startDate || !endDate) return;
    const qs = new URLSearchParams({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    }).toString();
    window.open(`/api/analytics/brand/export.xlsx?${qs}`, "_blank");
  };

  const onExportBrandAmbassadorsXlsx = () => {
    if (!startDate || !endDate) return;
    const qs = new URLSearchParams({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    }).toString();
    window.open(`/api/analytics/brand/ambassadors/export.xlsx?${qs}`, "_blank");
  };

  const onExportAmbassadorXlsx = () => {
    if (!startDate || !endDate) return;
    const qs = new URLSearchParams({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    }).toString();
    window.open(`/api/analytics/sports-ambassador/export.xlsx?${qs}`, "_blank");
  };

  // --- CSV Export Helpers ---
  const toCSV = (rows) => {
    if (!rows || !rows.length) return "";
    const headers = Object.keys(rows[0]);
    const esc = (v) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.join(",")];
    for (const r of rows) {
      lines.push(headers.map((h) => esc(r[h])).join(","));
    }
    return lines.join("\n");
  };

  const download = (filename, content, type = "text/csv;charset=utf-8;") => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const buildBrandCampaignRows = (arr) => {
    return (arr || []).map((c) => ({
      campaignId: c.campaignId,
      campaignTitle: c.campaignTitle,
      compensationType: c.compensationType,
      clicks: c.totalClicks,
      conversions: c.totalConversions,
      revenue: c.revenue,
      totalCost: c.totalCost,
      aov: c.aov,
      epc: c.epc,
      cpa: c.cpa,
      roas: c.roas,
      platformEarnings: c.financials?.platformEarnings,
      ambassadorEarnings: c.financials?.ambassadorEarnings,
      brandSpend: c.financials?.brandSpend,
      vatAmount: c.financials?.vatAmount,
      stripeFees: c.stripeFees,
    }));
  };

  const buildBrandAmbassadorRows = (arr) => {
    const rows = [];
    (arr || []).forEach((c) => {
      (c.trafficByAmbassador || []).forEach((a) => {
        rows.push({
          campaignId: c.campaignId,
          campaignTitle: c.campaignTitle,
          ambassadorName: a.ambassadorName,
          trackingKey: a.trackingKey,
          clicks: a.clicks,
          conversions: a.conversions,
          ambassadorEarnings: a.ambassadorEarnings,
        });
      });
    });
    return rows;
  };

  const buildAmbassadorCampaignRows = (data) => {
    const list = Array.isArray(data?.campaigns) ? data.campaigns : [];
    return list.map((c) => ({
      campaignId: c.campaignId,
      campaignTitle: c.campaignTitle,
      compensationType: c.compensationType,
      clicks: c.totalClicks,
      conversions: c.totalConversions,
      ambassadorEarnings: c.financials?.ambassadorEarnings,
      brandSpend: c.financials?.brandSpend,
    }));
  };

  const onExportBrand = () => {
    if (!startDate || !endDate) return;
    try {
      const qs = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      }).toString();
      const url = `/api/analytics/brand/export.csv?${qs}`;
      window.open(url, "_blank");
    } catch (e) {
      const campaignRows = buildBrandCampaignRows(analyticsData || []);
      const csv = toCSV(campaignRows);
      download(`brand_campaigns_${new Date().toISOString().slice(0, 10)}.csv`, csv);
    }
  };

  const onExportBrandAmbassadors = () => {
    if (!startDate || !endDate) return;
    try {
      const qs = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      }).toString();
      const url = `/api/analytics/brand/ambassadors/export.csv?${qs}`;
      window.open(url, "_blank");
    } catch (e) {
      const rows = buildBrandAmbassadorRows(analyticsData || []);
      const csv = toCSV(rows);
      download(`brand_ambassadors_${new Date().toISOString().slice(0, 10)}.csv`, csv);
    }
  };

  const onExportAmbassador = () => {
    if (!startDate || !endDate) return;
    try {
      const qs = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      }).toString();
      const url = `/api/analytics/sports-ambassador/export.csv?${qs}`;
      window.open(url, "_blank");
    } catch (e) {
      const rows = buildAmbassadorCampaignRows(analyticsData);
      const csv = toCSV(rows);
      download(`ambassador_campaigns_${new Date().toISOString().slice(0, 10)}.csv`, csv);
    }
  };

  const getAmbassadorCompensationTypeTotals = () => {
    const campaigns = Array.isArray(analyticsData?.campaigns) ? analyticsData.campaigns : [];
    const filtered = selectedCompensationType === "all" ? campaigns : campaigns.filter((c) => c.compensationType === selectedCompensationType);
    const totals = { "pay-per-sale": 0, "pay-per-click": 0, "pay-per-lead": 0 };
    for (const c of filtered) {
      const type = c.compensationType;
      if (!type || !totals.hasOwnProperty(type)) continue;
      totals[type] += Number(c.totalConversions || 0);
    }
    return totals;
  };

  const getCompensationTypeTotals = () => {
    const data = getFilteredData();
    const totals = { "pay-per-sale": 0, "pay-per-click": 0, "pay-per-lead": 0 };
    if (!data || !Array.isArray(data)) return totals;
    for (const c of data) {
      const type = c.compensationType;
      if (!type || !totals.hasOwnProperty(type)) continue;
      totals[type] += Number(c.totalConversions || 0);
    }
    return totals;
  };

  const getFilteredData = () => {
    if (!analyticsData) return [];
    if (selectedCompensationType === "all") return analyticsData;
    if (role === "brand") {
      return analyticsData?.filter((campaign) => campaign.compensationType === selectedCompensationType);
    } else {
      return analyticsData?.campaigns?.filter((campaign) => campaign.compensationType === selectedCompensationType);
    }
  };

  const getBarChartData = () => {
    const filteredData = getFilteredData();
    const palette = ["#390a21", "#f26915", "#10B981"];
    if (role === "brand") {
      if (!filteredData?.length) return [[{ type: "string", label: t("compensationType") }, { type: "number", label: t("events") }, { role: "style" }]];
      const totals = getCompensationTypeTotals();
      return [
        [{ type: "string", label: t("compensationType") }, { type: "number", label: t("events") }, { role: "style" }],
        [t("types.sale"), totals["pay-per-sale"], palette[0]],
        [t("types.click"), totals["pay-per-click"], palette[1]],
        [t("types.lead"), totals["pay-per-lead"], palette[2]],
      ];
    } else {
      const totals = getAmbassadorCompensationTypeTotals();
      return [
        [{ type: "string", label: t("compensationType") }, { type: "number", label: t("events") }, { role: "style" }],
        [t("types.sale"), totals["pay-per-sale"], palette[0]],
        [t("types.click"), totals["pay-per-click"], palette[1]],
        [t("types.lead"), totals["pay-per-lead"], palette[2]],
      ];
    }
  };

  const getPieChartData = () => {
    const totals = role === "brand" ? getCompensationTypeTotals() : getAmbassadorCompensationTypeTotals();
    return [
      [{ type: "string", label: t("compensationType") }, { type: "number", label: t("events") }],
      [t("types.sale"), totals["pay-per-sale"]],
      [t("types.click"), totals["pay-per-click"]],
      [t("types.lead"), totals["pay-per-lead"]],
    ];
  };

  const chartOptions = {
    bar: {
      legend: { position: "none" },
      colors: ["#f26915"],
      bar: { groupWidth: "60%" },
      chartArea: { left: "10%", right: "5%", top: 20, bottom: 40 },
    },
    pie: {
      is3D: true,
      colors: ["#390a21", "#f26915", "#10B981", "#6366f1", "#f59e0b", "#f43f5e"],
      sliceVisibilityThreshold: 0,
      chartArea: { left: "5%", right: "5%", top: 20, bottom: 20 },
    }
  };

  const chartPalette = ["#390a21", "#f26915", "#10B981", "#6366f1", "#f59e0b", "#f43f5e"];

  // --- Helper Components ---
  const StatCard = ({ title, value, icon: Icon, color = "gray", trend, trendValue, subtitle }) => {
    const colorMap = {
      emerald: { bg: "bg-emerald-50", text: "text-emerald-600" },
      rose: { bg: "bg-rose-50", text: "text-rose-600" },
      blue: { bg: "bg-blue-50", text: "text-blue-600" },
      orange: { bg: "bg-orange-50", text: "text-[#f26915]" },
      purple: { bg: "bg-purple-50", text: "text-[#390a21]" },
      gray: { bg: "bg-gray-50", text: "text-gray-600" },
    };
    const colors = colorMap[color] || colorMap.gray;

    return (
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-2xl ${colors.bg} ${colors.text} text-xl transition-transform group-hover:scale-110`}>
            <Icon />
          </div>
          {trend && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {trend === 'up' ? <FiArrowUpRight /> : <FiArrowUpRight className="rotate-90" />}
              {trendValue}
            </div>
          )}
        </div>
        <div>
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.15em] mb-1">{title}</p>
          <h3 className="text-2xl font-black text-[#390a21] tabular-nums">{value}</h3>
          {subtitle && <p className="text-[10px] text-gray-400 font-medium mt-1">{subtitle}</p>}
        </div>
      </div>
    );
  };

  const Th = ({ children, className = "" }) => (
    <th className={`px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-50 ${className}`}>{children}</th>
  );

  const Td = ({ children, className = "" }) => (
    <td className={`px-4 py-4 text-sm font-bold text-[#390a21] border-b border-gray-50 ${className}`}>{children}</td>
  );

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50 p-6">
        <div className="bg-white rounded-3xl p-8 border border-red-100 shadow-xl max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-500 text-2xl mx-auto mb-4">!</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Error Loading Analytics</h2>
            <p className="text-gray-500 mb-6">{error}</p>
            <button
                onClick={() => { setError(null); fetchAnalytics(); }}
                className="w-full bg-[#390a21] text-white font-bold py-3 rounded-xl hover:bg-[#4a0d2b] transition-all active:scale-95"
            >
                {t("retry")}
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-[#F9FAFB] min-h-screen font-gothic overflow-hidden">
      <div className="hidden lg:block h-screen sticky top-0">
        {role === "brand" ? <Sidebar /> : <SidebarSports />}
      </div>

      <div className="flex-1 flex flex-col h-screen overflow-y-auto p-4 pt-8 md:p-8 md:pt-10">
        <div className="mx-auto w-full max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-black text-[#390a21] uppercase tracking-tight">
                {role === "brand" ? t("heading1") : t("heading2")}
              </h1>
              <p className="text-gray-500 text-sm font-medium">{t("subtitle2")}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-8 flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex flex-col md:flex-row items-center gap-4 w-full lg:w-auto">
              <div className="flex items-center gap-2 w-full md:w-auto">
                <FiCalendar className="text-[#f26915]" />
                <span className="text-xs font-black uppercase text-gray-400 tracking-widest">{t("start")}</span>
                <DatePicker
                  selected={startDate}
                  onChange={(d) => setStartDate(d)}
                  maxDate={endDate}
                  className="bg-gray-50 border-none rounded-lg px-3 py-1.5 text-sm font-bold text-[#390a21] focus:ring-2 focus:ring-orange-500 transition-all w-full md:w-32"
                />
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <span className="text-xs font-black uppercase text-gray-400 tracking-widest">{t("end")}</span>
                <DatePicker
                  selected={endDate}
                  onChange={(d) => setEndDate(d)}
                  minDate={startDate}
                  maxDate={new Date()}
                  className="bg-gray-50 border-none rounded-lg px-3 py-1.5 text-sm font-bold text-[#390a21] focus:ring-2 focus:ring-orange-500 transition-all w-full md:w-32"
                />
              </div>
              
              <div className="flex items-center gap-2 w-full md:w-auto border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-4">
                <FiFilter className="text-[#390a21]" />
                <span className="text-xs font-black uppercase text-gray-400 tracking-widest">Type</span>
                <select
                  value={selectedCompensationType}
                  onChange={(e) => setSelectedCompensationType(e.target.value)}
                  className="bg-gray-50 border-none rounded-lg px-3 py-1.5 text-sm font-bold text-[#390a21] focus:ring-2 focus:ring-[#390a21] transition-all w-full md:w-40"
                >
                  <option value="all">{t("types.all")}</option>
                  <option value="pay-per-sale">{t("types.sale")}</option>
                  <option value="pay-per-click">{t("types.click")}</option>
                  <option value="pay-per-lead">{t("types.lead")}</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
                {role === "brand" ? (
                    <button className="text-xs font-bold text-[#390a21] hover:underline" onClick={onExportBrandXlsx}>{t("exportExcel")}</button>
                ) : (
                    <button className="text-xs font-bold text-[#390a21] hover:underline" onClick={onExportAmbassadorXlsx}>{t("exportExcelSingle")}</button>
                )}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center h-96 bg-white rounded-3xl border border-gray-100 shadow-sm">
                <Loader />
                <p className="text-sm font-bold text-[#390a21] mt-4 ml-6 animate-pulse">{t("loading")}</p>
            </div>
          ) : (analyticsData && (role === "brand" ? analyticsData.length > 0 : Object.keys(analyticsData).length > 0)) ? (
            <div className="space-y-8 pb-12">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {role === "brand" && overview ? (
                  <>
                    <StatCard title={t("metrics.totalRevenue")} value={fmtCurrency(overview.revenue)} icon={FiDollarSign} color="emerald" subtitle={t("metrics.grossSales")} />
                    <StatCard title={t("metrics.totalCost")} value={fmtCurrency(overview.totalCost)} icon={FiActivity} color="rose" subtitle={t("metrics.marketingSpend")} />
                    <StatCard title={t("metrics.conversions")} value={fmtNumber(overview.conversions)} icon={FiTarget} color="blue" subtitle={`${fmtMaybePercent(overview.conversionRate)} Conv. Rate`} />
                    <StatCard title={t("metrics.roas")} value={fmtRatio(overview.roas)} icon={FiTrendingUp} color="orange" subtitle={t("metrics.returnOnAdSpend")} />
                  </>
                ) : role === "sports-ambassador" && analyticsData ? (
                  <>
                    <StatCard title={t("metrics.yourEarnings")} value={fmtCurrency(analyticsData.earnings)} icon={FiDollarSign} color="orange" subtitle={t("metrics.paidCommissions")} />
                    <StatCard title={t("metrics.totalClicks")} value={fmtNumber(analyticsData.clicks)} icon={FiMousePointer} color="blue" subtitle={t("metrics.trafficGenerated")} />
                    <StatCard title={t("metrics.conversions")} value={fmtNumber(analyticsData.conversions)} icon={FiTarget} color="emerald" subtitle={t("metrics.successfulSales")} />
                    <StatCard title={t("metrics.shares")} value={fmtNumber(analyticsData.shares)} icon={FiUsers} color="purple" subtitle={t("metrics.campaignDistributions")} />
                  </>
                ) : null}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
                   <div className="absolute top-0 left-0 w-1 h-full bg-[#f26915] opacity-0 group-hover:opacity-100 transition-all"></div>
                   <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-orange-50 text-[#f26915] rounded-lg"><FiBarChart2 /></div>
                      <h2 className="text-lg font-black text-[#390a21] uppercase tracking-tight">{t("core")}</h2>
                   </div>
                   <Chart
                      chartType="ColumnChart"
                      data={getBarChartData()}
                      options={{
                        ...chartOptions.bar,
                        colors: [chartPalette[1]],
                        backgroundColor: 'transparent',
                        chartArea: { width: '85%', height: '70%', top: 20 },
                        vAxis: { gridlines: { color: '#f3f4f6' }, baselineColor: '#e5e7eb' },
                        hAxis: { textStyle: { color: '#9ca3af', fontSize: 10, bold: true } }
                      }}
                      width="100%"
                      height="300px"
                    />
                </div>

                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
                   <div className="absolute top-0 left-0 w-1 h-full bg-[#390a21] opacity-0 group-hover:opacity-100 transition-all"></div>
                   <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-purple-50 text-[#390a21] rounded-lg"><FiPieChart /></div>
                      <h2 className="text-lg font-black text-[#390a21] uppercase tracking-tight">{t("chartOptions.pie")}</h2>
                   </div>
                   <Chart
                      chartType="PieChart"
                      data={getPieChartData()}
                      options={{
                        ...chartOptions.pie,
                        colors: chartPalette,
                        backgroundColor: 'transparent',
                        chartArea: { width: '90%', height: '80%' },
                        legend: { position: 'right', textStyle: { color: '#4b5563', fontSize: 10, fontName: 'Inter', bold: true } },
                        pieHole: 0.4
                      }}
                      width="100%"
                      height="300px"
                    />
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 opacity-0 group-hover:opacity-100 transition-all"></div>
                  <div className="flex items-center justify-between mb-8">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><FiTrendingUp /></div>
                        <h2 className="text-xl font-black text-[#390a21] uppercase tracking-tight">{t("campaignPerformance")}</h2>
                     </div>
                     <div className="flex gap-2">
                        {role === "brand" ? (
                            <button className="px-3 py-1 bg-gray-50 border border-gray-100 rounded-lg text-[10px] font-black uppercase text-gray-500" onClick={onExportBrand}>{t("exportCSV")}</button>
                        ) : (
                            <button className="px-3 py-1 bg-gray-50 border border-gray-100 rounded-lg text-[10px] font-black uppercase text-gray-500" onClick={onExportAmbassador}>{t("exportCSV")}</button>
                        )}
                     </div>
                  </div>

                  <div className="overflow-x-auto -mx-2">
                    <table className="w-full text-left border-separate border-spacing-y-2">
                      <thead>
                        <tr>
                          <Th>{t("table.campaign")}</Th>
                          <Th className="text-right">{t("table.revenue")}</Th>
                          <Th className="text-right">{t("table.clicks")}</Th>
                          <Th className="text-right">{t("table.conversions")}</Th>
                          <Th className="text-right">{t("table.roas")}</Th>
                          <Th className="text-right">{t("table.totalCost")}</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {(role === "brand" ? analyticsData : (analyticsData.campaigns || [])).map((camp, idx) => (
                          <tr key={idx} className="group/row transition-all hover:translate-x-1">
                            <Td className="rounded-l-xl bg-gray-50/30 group-hover/row:bg-gray-50 transition-colors">
                              <span className="block font-black text-[#390a21] leading-tight">{camp.campaignTitle}</span>
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{camp.compensationType}</span>
                            </Td>
                            <Td className="text-right bg-gray-50/30 group-hover/row:bg-gray-50 transition-colors">{fmtCurrency(camp.revenue || camp.financials?.brandSpend)}</Td>
                            <Td className="text-right bg-gray-50/30 group-hover/row:bg-gray-50 transition-colors tabular-nums">{fmtNumber(camp.totalClicks)}</Td>
                            <Td className="text-right bg-gray-50/30 group-hover/row:bg-gray-50 transition-colors tabular-nums">{fmtNumber(camp.totalConversions)}</Td>
                            <Td className="text-right bg-gray-50/30 group-hover/row:bg-gray-50 transition-colors">
                                <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${Number(camp.roas) > 1 ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                                    {fmtRatio(camp.roas || 0)}
                                </span>
                            </Td>
                            <Td className="text-right rounded-r-xl bg-gray-50/30 group-hover/row:bg-gray-50 transition-colors font-black text-[#390a21]">
                                {fmtCurrency(camp.financials?.brandSpend || camp.totalCost)}
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
              </div>

              {role === "brand" && (
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
                   <div className="absolute top-0 left-0 w-1 h-full bg-[#390a21] opacity-0 group-hover:opacity-100 transition-all"></div>
                   <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-purple-50 text-[#390a21] rounded-lg"><FiUsers /></div>
                         <h2 className="text-xl font-black text-[#390a21] uppercase tracking-tight">{t("ambassadorInfluence")}</h2>
                      </div>
                      <button className="px-3 py-1 bg-gray-50 border border-gray-100 rounded-lg text-[10px] font-black uppercase text-gray-500" onClick={onExportBrandAmbassadors}>{t("exportCSV")}</button>
                   </div>

                   <div className="space-y-6">
                     {analyticsData.map((campaign) => (
                       <div key={campaign.campaignId} className="border-b border-gray-50 pb-6 last:border-0 last:pb-0">
                         <div className="flex items-center gap-2 mb-4">
                            <span className="w-2 h-2 rounded-full bg-[#f26915]"></span>
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">{campaign.campaignTitle}</h3>
                         </div>
                         {campaign.trafficByAmbassador.length > 0 ? (
                           <div className="overflow-x-auto">
                             <table className="w-full text-left">
                               <thead>
                                 <tr>
                                   <Th className="py-2">{t("table.ambassador")}</Th>
                                   <Th className="py-2 text-right">{t("table.clicks")}</Th>
                                   <Th className="py-2 text-right">{t("table.conv")}</Th>
                                   <Th className="py-2 text-right tracking-tight">{t("table.payout")}</Th>
                                 </tr>
                               </thead>
                               <tbody>
                                 {campaign.trafficByAmbassador.map((amb) => (
                                   <tr key={amb.athleteId} className="hover:bg-gray-50 transition-colors">
                                     <Td className="py-2">{amb.ambassadorName}</Td>
                                     <Td className="py-2 text-right tabular-nums">{fmtNumber(amb.clicks)}</Td>
                                     <Td className="py-2 text-right tabular-nums">{fmtNumber(amb.conversions)}</Td>
                                     <Td className="py-2 text-right text-emerald-600 font-black">{fmtCurrency(amb.ambassadorEarnings)}</Td>
                                   </tr>
                                 ))}
                               </tbody>
                             </table>
                           </div>
                         ) : (
                           <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest py-4">{t("table.noTraffic")}</p>
                         )}
                       </div>
                     ))}
                   </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-96 bg-white rounded-3xl border border-gray-100 shadow-sm text-center p-8">
                <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center text-gray-200 text-3xl mb-4"><FiActivity /></div>
                <h3 className="text-xl font-black text-[#390a21] uppercase tracking-tight mb-2">{t("noData")}</h3>
                <p className="text-gray-400 text-sm font-medium">{t("adjustRange")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
