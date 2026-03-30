"use client";
import Pagination from "@/components/Pagination/pagination";
import api from "@/lib/axios";
import moment from "moment";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BsPencil } from "react-icons/bs";
import { FaRegTrashAlt } from "react-icons/fa";
import { FaRegEye } from "react-icons/fa6";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { useTranslations, useLocale } from "next-intl";

const AdminFAQ = () => {
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const t = useTranslations("Admin.helpCenter");
  const toastAlert = useTranslations("Sweetalert");
  const locale = useLocale()?.toLowerCase?.() || "en";
  const limit = 10;
  const router = useRouter();
  const [userType, setUserType] = useState("all");

  useEffect(() => {
    getHelpCenterData();
  }, [currentPage, locale, userType]);

  const getHelpCenterData = async () => {
    try {
      const resp = await api.get(`/admin/help`, {
        params: { page: currentPage, locale, userType },
      });

      const payload = resp || {};
      const items = Array.isArray(payload?.data) ? payload?.data : [];
      setData(items);
      setPageCount(payload?.pagination?.totalPages || 1);
    } catch (err) {
      setError("Failed to load FAQs. Please try again later.");
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };
  const handleDelete = async (id) => {
    try {
      const result = await Swal.fire({
        title: toastAlert("sure"),
        text: toastAlert("deleteHelpTxt"),
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: toastAlert("deleteBtn"),
        cancelButtonText: toastAlert("cancel"),
        customClass: {
          confirmButton: "confirmButton",
          cancelButton: "cancelButton",
        },
      });

      if (result.isConfirmed) {
        const resp = await api.delete(`/admin/help/${id}`);
        if (resp) {
          await Swal.fire({
            title: toastAlert("deleteHelpSuccess"),
            position: "top-right",
            icon: "success",
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
          getHelpCenterData();
        }
      }
    } catch (err) {
      setError("Failed to delete FAQ");
    }
  };
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">{t("heading")}</h1>
        <div className="flex items-center gap-3">
          <select
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            value={userType}
            onChange={(e) => {
              setUserType(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">All</option>
            <option value="sports-ambassador">{t("ambassador")}</option>
            <option value="fan">{t("fan")}</option>
            <option value="brand">{t("brand")}</option>
          </select>
          <Link
            href="/admin/help-center/add"
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            {t("add")}
          </Link>
        </div>
      </div>
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">
                {t("no")}
              </th>
              <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">
                {t("title")}
              </th>
              <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">
                {t("type")}44
              </th>
              <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">
                {t("desc")}
              </th>
              <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">
                {t("created")}
              </th>
              <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">
                {t("actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {data?.length > 0 ? (
              data.map((item, i) => {
                const startSerial = (currentPage - 1) * limit + 1;
                const serialNumber = startSerial + i;
                const title =
                  typeof item?.title === "object"
                    ? item?.title?.[locale] ||
                      item?.title?.en ||
                      item?.title?.fi
                    : item?.title;
                const description =
                  typeof item?.description === "object"
                    ? item?.description?.[locale] ||
                      item?.description?.en ||
                      item?.description?.fi
                    : item?.description;
                return (
                  <tr key={item._id} className="hover:bg-gray-50">
                    <td className="py-2 px-4 border-b text-sm text-gray-900">
                      {serialNumber}
                    </td>
                    <td className="py-2 px-4 border-b text-sm text-gray-900">
                      {title}
                    </td>
                    <td
                      title={item?.userType}
                      className="py-2 px-4 border-b text-sm text-gray-900"
                    >
                      {item.userType.charAt(0).toUpperCase() +
                        item.userType.slice(1)}
                    </td>
                    <td
                      title={description}
                      className="py-2 px-4 border-b text-sm text-gray-900 help-content"
                      dangerouslySetInnerHTML={{
                        __html: description
                          ? description.length > 20
                            ? `${description.slice(0, 20)}...`
                            : description
                          : "N/A",
                      }}
                    />
                    <td className="py-2 px-4 border-b text-sm text-gray-900">
                      {moment(item.createdAt).format("LLL")}
                    </td>
                    <td className="py-2 px-4 border-b text-sm text-gray-900">
                      <div className="flex space-x-2">
                        <button
                          onClick={() =>
                            router.push(`/admin/help-center/${item?._id}`)
                          }
                          className="px-3 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200 text-sm  shadow-sm"
                        >
                          <FaRegEye />
                        </button>
                        <button
                          onClick={() =>
                            router.push(`/admin/help-center/edit/${item?._id}`)
                          }
                          className="px-3 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 text-sm  shadow-sm"
                        >
                          <BsPencil />
                        </button>
                        <button
                          onClick={() => handleDelete(item?._id)}
                          className="px-3 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200 text-sm shadow-sm"
                        >
                          <FaRegTrashAlt />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan="10"
                  className="py-2 px-4 text-center text-sm text-gray-500"
                >
                  {error ? `${t("fallback")}` : `${t("fallback1")}`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        currentPage={currentPage}
        pageCount={pageCount}
        onPageChange={handlePageChange}
      />
    </div>
  );
};

export default AdminFAQ;
