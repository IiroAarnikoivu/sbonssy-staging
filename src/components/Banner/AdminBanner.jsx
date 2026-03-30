"use client";

import api from "@/lib/axios";
import moment from "moment";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BsPencil } from "react-icons/bs";
import { FaRegTrashAlt } from "react-icons/fa";
import { FaRegEye } from "react-icons/fa6";
import Swal from "sweetalert2";

const AdminBanner = () => {
  const [banner, setBanner] = useState([]);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();
  const t = useTranslations("Admin");
  const locale = useLocale();
  const toastAlert = useTranslations("Sweetalert");
  useEffect(() => {
    getData();
  }, [currentPage, setBanner, locale]);
  const getData = async () => {
    try {
      const resp = await api.get(`/admin/banner?locale=${locale}`);
      setBanner(resp?.data.data || []);
    } catch (err) {
      setError("Failed to load banners. Please try again later.");
    }
  };
  const handleDelete = async (id) => {
    try {
      const result = await Swal.fire({
        title: toastAlert("sure"),
        text: toastAlert("bannerDltTxt"),
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
        const resp = await api.delete(`/admin/banner/${id}`);
        if (resp) {
          Swal.fire({
            title: toastAlert("bannerDltSuccess"),
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
      setError("Failed to delete banner");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">{t("heading")}</h1>
        {banner.length < 3 && (
          <Link
            href="/admin/banner/add"
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200 font-medium shadow-sm"
          >
            {t("link")}
          </Link>
        )}
      </div>
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
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
                {t("desc")}
              </th>
              <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">
                {t("img")}
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
            {banner.length > 0 ? (
              banner.map((item, index) => (
                <tr key={item._id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b text-sm text-gray-900">
                    {index + 1}
                  </td>
                  <td className="py-2 px-4 border-b text-sm text-gray-900">
                    {item.title || "Untitled"}
                  </td>
                  <td className="py-2 px-4 border-b text-sm text-gray-900">
                    {item.description || "No description"}
                  </td>
                  <td className="py-2 px-4 border-b text-sm text-gray-900">
                    {item.image && item.image !== "" ? (
                      <Image
                        src={item.image}
                        height={100}
                        width={100}
                        alt={`Banner Image ${item.title}`}
                        className="rounded-md"
                      />
                    ) : (
                      <span>No image available</span>
                    )}
                  </td>
                  <td className="py-2 px-4 border-b text-sm text-gray-900">
                    {moment(item.createdAt).format("LLL") || "Unknown"}
                  </td>
                  <td className="py-2 px-4 border-b text-sm text-gray-900">
                    <div className="flex space-x-2">
                      <button
                        onClick={() =>
                          router.push(`/admin/banner/${item?._id}`)
                        }
                        className="px-3 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200 text-sm shadow-sm"
                      >
                        <FaRegEye />
                      </button>
                      <button
                        onClick={() =>
                          router.push(`/admin/banner/edit/${item?._id}`)
                        }
                        className="px-3 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 text-sm shadow-sm"
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
              ))
            ) : (
              <tr>
                <td
                  colSpan="6"
                  className="py-2 px-4 border-b text-sm text-gray-900 text-center"
                >
                  {t("fallback")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminBanner;
