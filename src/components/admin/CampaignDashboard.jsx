"use client";

import api from "@/lib/axios";
import { useEffect, useState } from "react";
import Chart from "react-google-charts";

export default function CampaignDashboard() {
  const [state, setState] = useState({
    totalCampaigns: 0,
    campaignByMonth: [],
    selectedYear: "2025",
  });

  const currentYear = new Date().getFullYear();
  const range = 10;
  const years = Array.from({ length: range + 1 }, (_, i) => currentYear - i);

  const getMonthName = (monthNum) => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return months[monthNum - 1];
  };

  const filteredData =
    state.campaignByMonth?.filter(
      (item) => item.year === parseInt(state.selectedYear)
    ) || [];

  const chartData =
    filteredData.length > 0
      ? [
          ["Month", "Campaigns"],
          ...filteredData.map((item) => [getMonthName(item.month), item.count]),
        ]
      : [
          ["Month", "Campaigns"],
          ["No Data", 0],
        ];

  const chartOptions = {
    title: `Campaign Growth (${state.selectedYear})`,
    chartArea: { width: "80%", height: "70%" },
    hAxis: { title: "Month" },
    vAxis: { title: "Campaigns", minValue: 0 },
    legend: { position: "none" },
    colors: ["#4bc0c0"],
  };

  useEffect(() => {
    (async () => {
      try {
        const resp = await api.get(
          `/admin/total-campaigns?year=${state.selectedYear}`
        );

        setState((prev) => ({
          ...prev,
          totalCampaigns: resp?.total || 0,
          campaignByMonth:
            resp?.data?.map((item) => ({
              ...item,
              year: resp?.year,
            })) || [],
        }));
      } catch (error) {
        console.error("Error fetching campaigns:", error);
      }
    })();
  }, [state.selectedYear]);

  const handleYearChange = (e) => {
    setState((prev) => ({
      ...prev,
      selectedYear: e.target.value,
    }));
  };

  return (
    <main className="flex-1 p-6 bg-gray-100">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Total Campaigns</h3>
          <p className="text-3xl font-bold">{state.totalCampaigns}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow col-span-1 md:col-span-2 lg:col-span-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Campaign Growth</h3>
            <select
              value={state.selectedYear}
              onChange={handleYearChange}
              className="border rounded p-2"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div className="h-64 w-full">
            {filteredData.length === 0 ? (
              <p className="text-center text-gray-500">
                No data available for {state.selectedYear}
              </p>
            ) : (
              <Chart
                chartType="ColumnChart"
                data={chartData}
                options={chartOptions}
                width="100%"
                height="100%"
              />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
