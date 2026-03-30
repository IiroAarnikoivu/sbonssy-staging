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
import { useTranslations } from "next-intl";

const AdminFAQ = () => {
  const [faqs, setFaqs] = useState([]);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const t = useTranslations("Admin.faqs");
  const toastAlert = useTranslations("Sweetalert");
  const limit = 10;
  const router = useRouter();

  useEffect(() => {
    getData();
  }, [currentPage]);
  const getData = async () => {
    try {
      const resp = await api.get("/admin/faqs", {
        params: { page: currentPage, limit },
      });
      setFaqs(resp?.faqs || []);
      setPageCount(resp?.pagination?.totalPages || 1);
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
        text: toastAlert("deleteFaqTxt"),
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
        const resp = await api.delete(`/admin/faqs/${id}`);
        if (resp) {
          await Swal.fire({
            title: toastAlert("deleteFaqSuccessTxt"),
            position: "top-right",
            icon: "success",
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
          router.push("/admin/faqs");
          getData();
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
        <Link
          href="/admin/faqs/add"
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          {t("link")}
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
                {t("question")}
              </th>
              <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">
                {t("answer")}
              </th>
              <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">
                {t("created")}
              </th>
              <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">
                {t("action")}
              </th>
            </tr>
          </thead>
          <tbody>
            {faqs?.length > 0 ? (
              faqs.map((faq, i) => {
                const startSerial = (currentPage - 1) * limit + 1;
                const serialNumber = startSerial + i;
                return (
                  <tr key={faq._id} className="hover:bg-gray-50">
                    <td className="py-2 px-4 border-b text-sm text-gray-900">
                      {serialNumber}
                    </td>
                    <td className="py-2 px-4 border-b text-sm text-gray-900">
                      <Link
                        href={`/admin/faqs/${faq._id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {faq.question}
                      </Link>
                    </td>
                    <td
                      className="py-2 px-4 border-b text-sm text-gray-900"
                      title={faq?.answer}
                    >
                      {faq?.answer && faq?.answer?.length > 20
                        ? faq?.answer.slice(0, 20) + "..."
                        : faq?.answer || "Unknown"}
                    </td>
                    <td className="py-2 px-4 border-b text-sm text-gray-900">
                      {moment(faq.createdAt).format("LLL")}
                    </td>
                    <td className="py-2 px-4 border-b text-sm text-gray-900">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => router.push(`/admin/faqs/${faq?._id}`)}
                          className="px-3 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200 text-sm shadow-sm"
                        >
                          <FaRegEye />
                        </button>
                        <button
                          onClick={() =>
                            router.push(`/admin/faqs/edit/${faq?._id}`)
                          }
                          className="px-3 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 text-sm shadow-sm"
                        >
                          <BsPencil />
                        </button>
                        <button
                          onClick={() => handleDelete(faq?._id)}
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
                  {error ? `${t("fallback")}` : `${t("fallback2")}`}
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
