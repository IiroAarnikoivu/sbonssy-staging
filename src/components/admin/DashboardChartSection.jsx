"use client";

import Chart from "react-google-charts";

export default function DashboardChartSection({
  t,
  years,
  selectedYear,
  onYearChange,
  loading,
  data,
  options,
}) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">{t("chart.title")}</h3>
        <select
          value={selectedYear}
          onChange={onYearChange}
          className="border rounded p-2"
          disabled={loading}
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      <div className="h-96 w-full">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <p>{t("chart.loading")}</p>
          </div>
        ) : (
          <Chart
            chartType="ColumnChart"
            data={data}
            options={options}
            width="100%"
            height="100%"
          />
        )}
      </div>
    </div>
  );
}
