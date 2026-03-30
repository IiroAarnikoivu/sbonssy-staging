"use client";

import Loader from "@/components/Loader";
import Pagination from "@/components/Pagination/pagination";
import api from "@/lib/axios";
import { toCamelCase } from "@/lib/helper";
import moment from "moment";
import { useTranslations } from "next-intl";
import React, { useEffect, useState } from "react";

const Campaign = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const t = useTranslations("Admin.campaign");
  const limit = 10;

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const response = await api.get("/admin/campaign", {
          params: { page: currentPage, limit },
        });
        setCampaigns(response.data.campaigns);
        setPageCount(response.data?.pagination?.totalPages || 1);
      } catch (error) {
        console.error("Error fetching campaigns:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, [currentPage]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">{t("heading")}</h1>

      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-lg text-gray-500">{t("fallback")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    t("serialNo"),
                    t("title"),
                    t("type"),
                    t("name"),
                    t("amb"),
                    t("status"),
                    t("created"),
                  ].map((header) => (
                    <th
                      key={header}
                      className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {campaigns.map((campaign, i) => {
                  const subRole = toCamelCase(campaign?.userId?.subRole);
                  const userName = campaign?.userId?.[subRole]?.name;
                  const startSerial = (currentPage - 1) * limit + 1;
                  const serialNumber = startSerial + i;

                  return (
                    <tr
                      key={campaign._id}
                      className="hover:bg-gray-50 transition-colors duration-200"
                    >
                      <td className="py-4 px-4 text-sm text-gray-700">
                        {serialNumber}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-700">
                        {campaign?.campaignId?.basics?.title || "N/A"}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-700">
                        {campaign?.campaignId?.basics?.campaignType
                          .charAt(0)
                          .toUpperCase() +
                          campaign?.campaignId?.basics?.campaignType.slice(1) ||
                          "N/A"}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-700">
                        {campaign?.brandId?.brand?.companyName || "N/A"}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-700">
                        {userName || "N/A"}
                      </td>
                      <td className="py-4 px-4 text-sm">
                        <span
                          className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                            campaign.status === "Active"
                              ? "bg-green-100 text-green-800"
                              : campaign.status === "Inactive"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {campaign.status.charAt(0).toUpperCase() +
                            campaign.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-700">
                        {moment(campaign.createdAt).format("LLL")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6">
        <Pagination
          currentPage={currentPage}
          pageCount={pageCount}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
};

export default Campaign;
