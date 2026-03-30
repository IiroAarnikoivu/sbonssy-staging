"use client";
import Pagination from "@/components/Pagination/pagination";
import api from "@/lib/axios";
import moment from "moment";
import { useTranslations } from "next-intl";
import React, { useEffect, useState } from "react";
import { FaRegTrashAlt } from "react-icons/fa";
import Swal from "sweetalert2";

// Utility function to format role names
const formatRoleName = (role) => {
  if (!role) return "";

  // Handle specific cases
  const roleMap = {
    sportsAmbassador: "Sports Ambassador",
    brandPartner: "Brand Partner",
    mediaInquiry: "Media Inquiry",
    fan: "Fan",
    other: "Other",
  };

  // Return mapped value if exists, otherwise format camelCase to Title Case
  if (roleMap[role]) {
    return roleMap[role];
  }

  // Convert camelCase to Title Case for any other values
  return role
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

const Inquiry = () => {
  const [inquiries, setInquiries] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const t = useTranslations("Admin.inquiry");
  const toastAlert = useTranslations("Sweetalert");
  const limit = 10;

  useEffect(() => {
    (async () => {
      try {
        const resp = await api.get(
          `/admin/inquiry?page=${currentPage}&limit=${limit}`
        );

        setInquiries(resp?.data?.data || []);
        setPageCount(resp.data.pagination.totalPages || 1);
      } catch (error) {}
    })();
  }, [currentPage]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };
  const handleDelete = (id) => {
    const resp = api.delete(`/admin/inquiry?id=${id}`);
    if (resp) {
      Swal.fire({
        title: toastAlert("inquiryDeleted"),
        icon: "success",
        position: "top-right",
        showConfirmButton: false,
        timer: 2000,
        toast: true,
      });
    }
  };
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{t("heading")}</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 border-b text-left">{t("no")}</th>
              <th className="py-2 px-4 border-b text-left">{t("first")}</th>
              <th className="py-2 px-4 border-b text-left">{t("last")}</th>
              <th className="py-2 px-4 border-b text-left">{t("email")}</th>
              <th className="py-2 px-4 border-b text-left">{t("phone")}</th>
              <th className="py-2 px-4 border-b text-left">{t("role")}</th>
              {/* <th className="py-2 px-4 border-b text-left">{t("topic")}</th> */}
              <th className="py-2 px-4 border-b text-left">{t("message")}</th>
              <th className="py-2 px-4 border-b text-left">{t("created")}</th>
              <th className="py-2 px-4 border-b text-left">{t("action")}</th>
            </tr>
          </thead>
          <tbody>
            {inquiries.length > 0 ? (
              inquiries.map((inquiry, i) => {
                const startSerial = (currentPage - 1) * limit + 1;
                const serialNumber = startSerial + i;
                return (
                  <tr
                    key={i}
                    className="hover:bg-gray-50 border-b border-gray-200"
                  >
                    <td className="py-2 px-4 border-b border-gray-200">
                      {serialNumber}
                    </td>
                    <td className="py-2 px-4 border-b border-gray-200">
                      {inquiry.firstName}
                    </td>
                    <td className="py-2 px-4 border-b border-gray-200">
                      {inquiry.lastName}
                    </td>
                    <td className="py-2 px-4 border-b border-gray-200">
                      {inquiry.email}
                    </td>
                    <td className="py-2 px-4 border-b border-gray-200">
                      {inquiry.phone}
                    </td>
                    <td className="py-2 px-4 border-b border-gray-200">
                      {formatRoleName(inquiry.role)}
                    </td>
                    {/* <td className="py-2 px-4 border-b border-gray-200">{inquiry.topic}</td> */}
                    <td
                      className="py-2 px-4 border-b border-gray-200"
                      title={inquiry.message}
                    >
                      {inquiry.message.slice(0, 50) + "..."}
                    </td>
                    <td className="py-2 px-4 border-b border-gray-200">
                      {moment(inquiry.createdAt).format("LLL")}
                    </td>
                    <td
                      className="py-2 px-4 border-b border-gray-200"
                      onClick={() => handleDelete(inquiry._id)}
                    >
                      <FaRegTrashAlt />
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="8" className="py-2 px-4 border-b text-center">
                  {t("fallback")}
                </td>
              </tr>
            )}
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

export default Inquiry;
