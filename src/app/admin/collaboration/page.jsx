"use client";

import Loader from "@/components/Loader";
import Pagination from "@/components/Pagination/pagination";
import api from "@/lib/axios";
import { toCamelCase } from "@/lib/helper";
import moment from "moment";
import { useTranslations } from "next-intl";
import React, { useEffect, useState } from "react";

const Collaboration = () => {
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const t = useTranslations("Admin.collaboration");
  const limit = 10;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await api.get("/admin/all-collaboration", {
          params: { page: currentPage, limit },
        });
        setData(response.data.requests);
        setPageCount(response.data?.pagination?.totalPages || 1);
      } catch (err) {
        console.error("Error fetching collaborations:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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
        ) : error ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-lg text-red-500">
              {t("error")}: {error}
            </p>
          </div>
        ) : data.length === 0 ? (
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
                    t("sender"),
                    t("receiver"),
                    t("status"),
                    t("date"),
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
                {data.map((req, i) => {
                  let senderName = "";
                  let receiverName = "";

                  // Determine sender and receiver names based on role
                  if (
                    req.ambassadorId?.role === "sports-ambassador" &&
                    req.brandId?.role === "sports-ambassador"
                  ) {
                    const subRole = toCamelCase(req.brandId?.subRole);
                    senderName = req.brandId[subRole]?.name || "Ambassador";
                    const subRoleAmbassador = toCamelCase(
                      req.ambassadorId?.subRole
                    );
                    receiverName =
                      req.ambassadorId[subRoleAmbassador]?.name || "Ambassador";
                  } else if (
                    req.brandId?.role === "brand" &&
                    req.ambassadorId?.role === "sports-ambassador"
                  ) {
                    senderName = req.brandId?.brand?.companyName || "Brand";
                    receiverName =
                      req.ambassadorId?.paraAthlete?.name ||
                      req.ambassadorId[toCamelCase(req.ambassadorId?.subRole)]
                        ?.name ||
                      "Ambassador";
                  } else {
                    senderName = t("unknown");
                    receiverName = t("unknown");
                  }
                  const startSerial = (currentPage - 1) * limit + 1;
                  const serialNumber = startSerial + i;
                  return (
                    <tr
                      key={req._id}
                      className="hover:bg-gray-50 transition-colors duration-200"
                    >
                      <td className="py-4 px-4 text-sm text-gray-700">
                        {serialNumber}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-700">
                        {senderName}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-700">
                        {receiverName}
                      </td>
                      <td className="py-4 px-4 text-sm">
                        <span
                          className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                            req.status === "accepted"
                              ? "bg-green-100 text-green-800"
                              : req.status === "rejected"
                              ? "bg-red-100 text-red-800"
                              : req.status === "cancelled"
                              ? "bg-gray-100 text-gray-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {req.status.charAt(0).toUpperCase() +
                            req.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-700">
                        {moment(req.createdAt).format("LLL")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pageCount > 1 && (
        <div className="mt-6">
          <Pagination
            currentPage={currentPage}
            pageCount={pageCount}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
};

export default Collaboration;
