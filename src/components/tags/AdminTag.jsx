"use client";
import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import Pagination from "@/components/Pagination/pagination";
import moment from "moment";
import Link from "next/link";
import { BsPencil } from "react-icons/bs";
import { FaRegTrashAlt } from "react-icons/fa";
import { FaRegEye } from "react-icons/fa6";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { useTranslations, useLocale } from "next-intl";

const AdminTag = () => {
  const [tags, setTags] = useState([]);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const t = useTranslations("Admin");
  const toastAlert = useTranslations("Sweetalert");
  const limit = 10;
  const router = useRouter();
  const locale = useLocale()?.toLowerCase?.() || "en";

  useEffect(() => {
    getData();
  }, [currentPage, locale]);
  const getData = async () => {
    try {
      const resp = await api.get("/admin/tags", {
        params: { page: currentPage, limit, locale },
      });
      setTags(resp?.tags || []);
      setPageCount(resp?.pagination?.totalPages || 1);
    } catch (err) {
      setError("Failed to load tags. Please try again later.");
    }
  };
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };
  const handleDelete = async (id) => {
    try {
      const result = await Swal.fire({
        title: toastAlert("sure"),
        text: toastAlert("deleteTagTxt"),
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
        const resp = await api.delete(`/admin/tags/${id}`);
        if (resp) {
          Swal.fire({
            title: toastAlert("tagDeleted"),
            position: "top-right",
            icon: "success",
            toast: true,
            showConfirmButton: false,
            timerProgressBar: false,
            timer: 3000,
          });
        }
        getData();
      }
    } catch (err) {
      Swal.fire({
        title: toastAlert("tagDeleteFailed"),
        position: "top-right",
        icon: "error",
        toast: true,
        showConfirmButton: false,
        timerProgressBar: false,
        timer: 3000,
      });
    }
  };
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">{t("tagHeading")}</h1>
        <Link
          href="/admin/tags/add"
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          {t("addTag")}
        </Link>
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
                {t("name")}
              </th>
              <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">
                {t("created")}{" "}
              </th>
              <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">
                {t("updated")}
              </th>
              <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">
                {t("actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {tags?.length > 0 ? (
              tags.map((tag, i) => {
                const startSerial = (currentPage - 1) * limit + 1;
                const serialNumber = startSerial + i;
                const localizedName =
                  typeof tag.name === "object"
                    ? tag.name?.[locale] || tag.name?.en || tag.name?.fi
                    : tag.name;
                return (
                  <tr key={tag._id} className="hover:bg-gray-50">
                    <td className="py-2 px-4 border-b text-sm text-gray-900">
                      {serialNumber}
                    </td>
                    <td className="py-2 px-4 border-b text-sm text-gray-900">
                      {localizedName}
                    </td>
                    <td className="py-2 px-4 border-b text-sm text-gray-900">
                      {moment(tag.createdAt).format("LLL")}
                    </td>
                    <td className="py-2 px-4 border-b text-sm text-gray-900">
                      {moment(tag.updatedAt).format("LLL")}
                    </td>
                    <td className="py-2 px-4 border-b text-sm text-gray-900">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => router.push(`/admin/tags/${tag?._id}`)}
                          className="px-3 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200 text-sm shadow-sm"
                        >
                          <FaRegEye />
                        </button>
                        <button
                          onClick={() =>
                            router.push(`/admin/tags/edit/${tag?._id}`)
                          }
                          className="px-3 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 text-sm shadow-sm"
                        >
                          <BsPencil />
                        </button>
                        <button
                          onClick={() => handleDelete(tag?._id)}
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
                  colSpan="4"
                  className="py-2 px-4 text-center text-sm text-gray-500"
                >
                  {error ? `${t("tagError")}` : `${t("fallbackTag")}`}
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

export default AdminTag;
