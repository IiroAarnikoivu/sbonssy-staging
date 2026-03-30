"use client";

export default function DashboardSummaryCards({ t, totalCampaigns, totalUsers }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-2">{t("totalCampaigns")}</h3>
        <p className="text-3xl font-bold">{totalCampaigns}</p>
      </div>
      {/* 
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-2">{t("totalCollaborations")}</h3>
        <p className="text-3xl font-bold">{state.totalCollaborations}</p>
      </div> */}

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-2">{t("totalUsers")}</h3>
        <p className="text-3xl font-bold">{totalUsers}</p>
      </div>
    </div>
  );
}
