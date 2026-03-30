"use client";
import Pagination from "@/components/Pagination/pagination";
import api from "@/lib/axios";
import moment from "moment";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { BsPencil } from "react-icons/bs";
import { FaRegTrashAlt } from "react-icons/fa";
import { FaRegEye } from "react-icons/fa6";
import Swal from "sweetalert2";

const AdminBlog = () => {
  const [blogs, setBlogs] = useState([]);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const t = useTranslations("Admin");
  const toastAlert = useTranslations("Sweetalert");
  const limit = 10;
  const locale = useLocale()?.toLowerCase?.() || "en";
  const router = useRouter();

  useEffect(() => {
    getData();
  }, [currentPage]);
  const getData = async () => {
    try {
      const resp = await api.get("/admin/blogs", {
        params: { page: currentPage, limit, locale },
      });
      setBlogs(resp?.blogs || []);
      setPageCount(resp?.pagination?.totalPages || 1);
    } catch (err) {
      setError("Failed to load blogs. Please try again later.");
    }
  };
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleDelete = async (id) => {
    try {
      const result = await Swal.fire({
        title: toastAlert("sure"),
        text: toastAlert("blogDeleteTxt"),
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: toastAlert("deleteBtn"), // Changed from "Save" to "Delete" for clarity
        cancelButtonText: toastAlert("cancel"), // Explicitly added for better UX
        customClass: {
          confirmButton: "confirmButton",
          cancelButton: "cancelButton",
        },
      });

      if (result.isConfirmed) {
        const resp = await api.delete(`/admin/blogs/${id}`);

        if (resp) {
          await Swal.fire({
            title: toastAlert("blogDeleteSuccessTxt"),
            position: "top-right",
            icon: "success",
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });

          router.push("/admin/blogs");
        }
        getData();
      }
    } catch (err) {
      console.error("Delete error:", err);
      await Swal.fire({
        title: toastAlert("error"),
        text: toastAlert("blogDeleteErrorTxt"),
        icon: "error",
      });
      setError("Failed to delete blog");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">{t("blogHeading")}</h1>
        <Link
          href="/admin/blogs/add"
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200 font-medium shadow-sm"
        >
          {t("blogLink")}
        </Link>
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
                {t("author")}
              </th>
              <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">
                {t("status")}
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
            {blogs?.length > 0 ? (
              blogs.map((blog, i) => {
                const startSerial = (currentPage - 1) * limit + 1;
                const serialNumber = startSerial + i;
                const localizedTitle =
                  typeof blog.title === "object"
                    ? blog.title?.[locale] || blog.title?.en || blog.title?.fi
                    : blog.title;
                return (
                  <tr key={blog._id} className="hover:bg-gray-50">
                    <td className="py-2 px-4 border-b text-sm text-gray-900">
                      {serialNumber}
                    </td>
                    <td className="py-2 px-4 border-b text-sm text-gray-900">
                      {localizedTitle || "Untitled"}
                    </td>
                    <td className="py-2 px-4 border-b text-sm text-gray-900">
                      {blog.author?.name || "Unknown"}
                    </td>
                    <td className="py-2 px-4 border-b text-sm text-gray-900">
                      {blog.status || "Unknown"}
                    </td>
                    <td className="py-2 px-4 border-b text-sm text-gray-900">
                      {moment(blog.createdAt).format("LLL") || "Unknown"}
                    </td>
                    <td className="py-2 px-4 border-b text-sm text-gray-900">
                      <div className="flex space-x-2">
                        <button
                          onClick={() =>
                            router.push(`/admin/blogs/${blog?._id}`)
                          }
                          className="px-3 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200 text-sm  shadow-sm"
                        >
                          <FaRegEye />
                        </button>
                        <button
                          onClick={() =>
                            router.push(`/admin/blogs/edit/${blog?._id}`)
                          }
                          className="px-3 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 text-sm  shadow-sm"
                        >
                          <BsPencil />
                        </button>
                        <button
                          onClick={() => handleDelete(blog?._id)}
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
                  colSpan="6"
                  className="py-2 px-4 border-b text-sm text-gray-900 text-center"
                >
                  {error ? `${t("fallbackBlog")}` : `${t("fallbackBlog2")}`}
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

export default AdminBlog;
