"use client";
import Loader from "@/components/Loader";
import api from "@/lib/axios";
import { useTranslations } from "next-intl";
import React, { useEffect, useState } from "react";

const Events = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const t = useTranslations("Admin.analytics");
  useEffect(() => {
    const fetchData = async () => {
      try {
        const resp = await api.get("/admin/events");
        setData(resp);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading)
    return (
      <div className="text-center py-8">
        <Loader />
      </div>
    );
  if (error)
    return (
      <div className="text-center py-8 text-red-500">
        {t("error")} {error}
      </div>
    );
  if (!data) return <div className="text-center py-8">{t("fallback")}</div>;

  // Get top 3 brands by revenue
  const topBrands = [...data.brands]
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 3);

  // Get top 3 ambassadors by revenue
  const topAmbassadors = [...data.ambassadors]
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 3);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">{t("heading")}</h1>

      {/* Summary Cards (Clicks removed) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-blue-50 rounded-lg shadow">
          <h3 className="font-medium">{t("subHeading")}</h3>
          <p className="text-2xl">€{data.totals.totalRevenue.toFixed(2)}</p>
        </div>
        <div className="p-4 bg-purple-50 rounded-lg shadow">
          <h3 className="font-medium">{t("title")}</h3>
          <p className="text-2xl">{data.totals.totalConversions}</p>
          <p>
            €{data.totals.conversionRevenue.toFixed(2)} {t("revenues")}
          </p>
        </div>
      </div>

      {/* Top Performers Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Top Brands */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">{t("subHeading2")}</h2>
          <div className="space-y-4">
            {topBrands.map((brand, index) => (
              <div
                key={brand.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded"
              >
                <div className="flex items-center">
                  <span className="font-bold mr-3">{index + 1}.</span>
                  <div>
                    <h3 className="font-medium">{brand.name}</h3>
                    <p className="text-sm text-gray-600">
                      {brand.campaignsRun} {t("campaigns")} |{" "}
                      {brand.ambassadorsWorkedWith} {t("ambassadors")}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    €{brand.totalRevenue.toFixed(2)}
                  </p>
                  <p className="text-sm text-green-600">
                    {brand.conversionCount} {t("conversions")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Ambassadors */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">{t("subHeading3")}</h2>
          <div className="space-y-4">
            {topAmbassadors.map((ambassador, index) => (
              <div
                key={ambassador.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded"
              >
                <div className="flex items-center">
                  <span className="font-bold mr-3">{index + 1}.</span>
                  <div>
                    <h3 className="font-medium">{ambassador.name}</h3>
                    <p className="text-sm text-gray-600">
                      {ambassador.brandsWorkedWith} {t("brands")} |{" "}
                      {ambassador.campaignsParticipated} {t("campaigns")}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    €{ambassador.totalRevenue.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Tables */}
      <div className="space-y-8">
        {/* Ambassadors Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold">{t("allAmbassador")}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-4 text-left">{t("ambassador")}</th>
                  <th className="py-3 px-4 text-left">{t("revenue")}</th>
                  <th className="py-3 px-4 text-left">{t("earning")}</th>
                  <th className="py-3 px-4 text-left">{t("conversion")}</th>
                  <th className="py-3 px-4 text-left">{t("brand")}</th>
                  <th className="py-3 px-4 text-left">{t("campaign")}</th>
                </tr>
              </thead>
              <tbody>
                {data.ambassadors.map((ambassador) => (
                  <tr key={ambassador.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{ambassador.name}</td>
                    <td className="py-3 px-4">
                      €{ambassador.totalRevenue.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      €{ambassador.totalEarnings.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">{ambassador.conversionCount}</td>
                    <td className="py-3 px-4">{ambassador.brandsWorkedWith}</td>
                    <td className="py-3 px-4">
                      {ambassador.campaignsParticipated}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Brands Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold">{t("brandTable.title")}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-4 text-left">
                    {t("brandTable.brand")}
                  </th>
                  <th className="py-3 px-4 text-left">
                    {t("brandTable.revenue")}
                  </th>
                  <th className="py-3 px-4 text-left">
                    {t("brandTable.payout")}
                  </th>
                  <th className="py-3 px-4 text-left">
                    {t("brandTable.conversation")}
                  </th>
                  <th className="py-3 px-4 text-left">
                    {t("brandTable.ambassador")}
                  </th>
                  <th className="py-3 px-4 text-left">
                    {t("brandTable.campaign")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.brands.map((brand) => (
                  <tr key={brand.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{brand.name}</td>
                    <td className="py-3 px-4">
                      €{brand.totalRevenue.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      €{brand.totalPayout.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">{brand.conversionCount}</td>
                    <td className="py-3 px-4">{brand.ambassadorsWorkedWith}</td>
                    <td className="py-3 px-4">{brand.campaignsRun}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Campaigns Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold">
              {t("campaignTable.title")}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-4 text-left">
                    {t("campaignTable.campaign")}
                  </th>
                  <th className="py-3 px-4 text-left">
                    {t("campaignTable.brand")}
                  </th>
                  <th className="py-3 px-4 text-left">
                    {t("campaignTable.revenue")}
                  </th>
                  <th className="py-3 px-4 text-left">
                    {t("campaignTable.payout")}
                  </th>
                  <th className="py-3 px-4 text-left">
                    {t("campaignTable.conversions")}
                  </th>
                  <th className="py-3 px-4 text-left">
                    {t("campaignTable.ambassador")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.campaigns.map((campaign) => (
                  <tr key={campaign.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium">{campaign.title}</div>
                      <div className="text-sm text-gray-600">
                        {campaign.description.length > 30
                          ? campaign.description.slice(0, 30) + "..."
                          : campaign.description}
                      </div>
                    </td>
                    <td className="py-3 px-4">{campaign.brandName}</td>
                    <td className="py-3 px-4">
                      €{campaign.totalRevenue.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      €{campaign.totalPayout.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">{campaign.conversionCount}</td>
                    <td className="py-3 px-4">
                      {campaign.ambassadorsParticipated}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Events;
