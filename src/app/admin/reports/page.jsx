"use client";

import Pagination from "@/components/Pagination/pagination";
import api from "@/lib/axios";
import { capitalizeFirstLetter } from "@/lib/helper";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import moment from "moment";
import React, { useEffect, useState } from "react";
import ExcelJS from "exceljs";
import { FaRegTrashAlt } from "react-icons/fa";
import Swal from "sweetalert2";

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [allReports, setAllReports] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const t = useTranslations("Admin.reports");
  const toastAlert = useTranslations("Sweetalert");
  const limit = 10;
  const DynamicCSVLink = dynamic(
    () => import("react-csv").then((mod) => mod.CSVLink),
    {
      ssr: false,
    }
  );

  useEffect(() => {
    (async () => {
      try {
        const resp = await api.get(
          `/admin/reports?page=${currentPage}&limit=${limit}`
        );

        setReports(resp?.data?.data);
        setPageCount(resp?.data.pagination?.totalPages || 1);
      } catch (error) {
        console.error("Error fetching reports:", error);
      }
    })();
  }, [currentPage]);

  useEffect(() => {
    (async () => {
      try {
        const resp = await api.get(`/admin/reports?limit=${0}`);
        setAllReports(resp.data.data);
      } catch (error) {
        console.error("Error fetching reports:", error);
      }
    })();
  }, [currentPage]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleDelete = async (id) => {
    const resp = await api.delete(`/admin/reports?id=${id}`);
    if (resp) {
      Swal.fire({
        title: toastAlert("deleted"),
        icon: "success",
        position: "top-right",
        showConfirmButton: false,
        timer: 2000,
        toast: true,
      });
    }
  };

  // Function to export to Excel
  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Reports");

    if (allReports.length > 0) {
      worksheet.columns = Object.keys(allReports[0]).map((key) => ({
        header: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1"),
        key: key,
        width: 20,
      }));
      worksheet.addRows(allReports);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `reports-${moment().format("YYYY-MM-DD")}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{t("heading")}</h1>
      <div className="flex gap-4 mb-4">
        <DynamicCSVLink
          data={allReports}
          filename={`reports-${moment().format("YYYY-MM-DD")}.csv`}
          className={`inline-block bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600`}
        >
          {t("csv")}
        </DynamicCSVLink>
        <button
          onClick={exportToExcel}
          className="inline-block bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600"
        >
          {t("excel")}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 border-b text-left">{t("serialNo")}</th>
              <th className="py-2 px-4 border-b text-left">{t("details")}</th>
              <th className="py-2 px-4 border-b text-left">{t("reason")}</th>
              <th className="py-2 px-4 border-b text-left">{t("reported")}</th>
              <th className="py-2 px-4 border-b text-left">{t("reporter")}</th>
              <th className="py-2 px-4 border-b text-left">{t("status")}</th>
              <th className="py-2 px-4 border-b text-left">{t("action")}</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report, i) => {
              const startSerial = (currentPage - 1) * limit + 1;
              const serialNumber = startSerial + i;
              return (
                <tr key={report._id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b">{serialNumber}</td>
                  <td className="py-2 px-4 border-b">{report.details}</td>
                  <td className="py-2 px-4 border-b">{report.reason}</td>
                  <td className="py-2 px-4 border-b">{report.reported}</td>
                  <td className="py-2 px-4 border-b">{report.reporter}</td>
                  <td className="py-2 px-4 border-b">
                    {capitalizeFirstLetter(report.status)}
                  </td>
                  <td
                    className="py-2 px-4 border-b"
                    onClick={() => handleDelete(report._id)}
                  >
                    <FaRegTrashAlt />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <Pagination
          currentPage={currentPage}
          pageCount={pageCount}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
};

export default Reports;
