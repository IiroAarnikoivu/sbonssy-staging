"use client";

import api from "@/lib/axios";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import DashboardSummaryCards from "./DashboardSummaryCards";
import DashboardChartSection from "./DashboardChartSection";

export default function CombinedDashboard() {
  const t = useTranslations("Admin.dashboard");
  const currentYear = new Date().getFullYear();

  const [state, setState] = useState({
    totalCampaigns: 0,
    totalCollaborations: 0,
    totalUsers: 0,
    campaignsByMonth: [],
    collaborationsByMonth: [],
    usersByMonth: [],
    selectedYear: currentYear,
    loading: true,
  });

  const range = 10;
  const years = Array.from({ length: range + 1 }, (_, i) => currentYear - i);

  const getMonthName = (monthNum) => {
    const months = [
      t("months.jan"),
      t("months.feb"),
      t("months.mar"),
      t("months.apr"),
      t("months.may"),
      t("months.jun"),
      t("months.jul"),
      t("months.aug"),
      t("months.sep"),
      t("months.oct"),
      t("months.nov"),
      t("months.dec"),
    ];
    return months[monthNum - 1];
  };

  const filteredCampaigns =
    state.campaignsByMonth?.filter(
      (item) => item.year === parseInt(state.selectedYear)
    ) || [];

  const filteredCollaborations =
    state.collaborationsByMonth?.filter(
      (item) => item.year === parseInt(state.selectedYear)
    ) || [];

  const filteredUsers =
    state.usersByMonth?.filter(
      (item) => item.year === parseInt(state.selectedYear)
    ) || [];

  const prepareCombinedChartData = () => {
    const headers = [
      t("chart.month"),
      t("totalCampaigns"),
      t("totalUsers"),
      // t("totalCollaborations"),
    ];

    if (
      filteredCampaigns.length === 0 &&
      // filteredCollaborations.length === 0 &&
      filteredUsers.length === 0
    ) {
      return [headers, [t("chart.noData"), 0, 0, 0]];
    }

    const monthData = {};
    for (let month = 1; month <= 12; month++) {
      monthData[month] = {
        monthName: getMonthName(month),
        campaigns: 0,
        collaborations: 0,
        users: 0,
      };
    }

    filteredCampaigns.forEach((item) => {
      monthData[item.month].campaigns = item.count;
    });

    // filteredCollaborations.forEach((item) => {
    //   monthData[item.month].collaborations = item.count;
    // });

    filteredUsers.forEach((item) => {
      monthData[item.month].users = item.count;
    });

    const chartData = [headers];
    for (let month = 1; month <= 12; month++) {
      chartData.push([
        monthData[month].monthName,
        monthData[month].campaigns,
        // monthData[month].collaborations,
        monthData[month].users,
      ]);
    }

    return chartData;
  };

  const combinedChartData = prepareCombinedChartData();

  const chartOptions = {
    title: `${t("chart.title")} (${state.selectedYear})`,
    chartArea: { width: "80%", height: "70%" },
    hAxis: { title: t("chart.month") },
    vAxis: { title: t("chart.count"), minValue: 0 },
    legend: { position: "top" },
    colors: ["#4bc0c0", "#ff9f40"],
    series: {
      0: { targetAxisIndex: 0 },
      // 1: { targetAxisIndex: 0 },
      2: { targetAxisIndex: 0 },
    },
    isStacked: false,
  };

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true }));

        const [campaignsResp, collaborationsResp, usersResp] =
          await Promise.all([
            api.get(`/admin/total-campaigns?year=${state.selectedYear}`),
            api.get(`/admin/total-collaboration?year=${state.selectedYear}`),
            api.get(`/admin/total-users?year=${state.selectedYear}`),
          ]);

        setState((prev) => ({
          ...prev,
          totalCampaigns: campaignsResp?.total || 0,
          totalCollaborations: collaborationsResp?.total || 0,
          totalUsers: usersResp?.data?.count || 0,
          campaignsByMonth:
            campaignsResp?.data?.map((item) => ({
              ...item,
              year: campaignsResp?.year,
            })) || [],
          collaborationsByMonth:
            collaborationsResp?.data?.map((item) => ({
              ...item,
              year: collaborationsResp?.year,
            })) || [],
          usersByMonth:
            usersResp?.data?.byMonth?.map((item) => ({
              ...item,
              year: usersResp?.data?.year,
            })) || [],
          loading: false,
        }));
      } catch (error) {
        console.error("Error fetching data:", error);
        setState((prev) => ({ ...prev, loading: false }));
      }
    };

    fetchAllData();
  }, [state.selectedYear]);

  const handleYearChange = (e) => {
    setState((prev) => ({
      ...prev,
      selectedYear: e.target.value,
    }));
  };

  return (
    <main className="flex-1 p-6 bg-gray-100">
      {/* Summary Cards */}
      <DashboardSummaryCards
        t={t}
        totalCampaigns={state.totalCampaigns}
        totalUsers={state.totalUsers}
      />

      {/* Chart Section */}
      <DashboardChartSection
        t={t}
        years={years}
        selectedYear={state.selectedYear}
        onYearChange={handleYearChange}
        loading={state.loading}
        data={combinedChartData}
        options={chartOptions}
      />
    </main>
  );
}
