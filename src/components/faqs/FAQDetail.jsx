"use client";
import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import { useRouter, useParams } from "next/navigation";
import moment from "moment";
import Link from "next/link";
import { useTranslations } from "next-intl";
import Loader from "../Loader";

const FAQDetail = () => {
  const [faq, setFaq] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const t = useTranslations("Admin.faqs");
  const { id } = useParams();

  useEffect(() => {
    (async () => {
      try {
        const resp = await api.get(`/admin/faqs/${id}`);
        setFaq(resp.faq);
      } catch (err) {
        setError("Failed to load FAQ. Please try again later.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this FAQ?")) return;
    try {
      await api.delete(`/admin/faqs/${id}`);
      router.push("/admin/faqs");
    } catch (err) {
      setError("Failed to delete FAQ");
    }
  };

  if (loading)
    return (
      <div className="container mx-auto p-4">
        <Loader />
      </div>
    );
  if (error)
    return <div className="container mx-auto p-4 text-red-700">{error}</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{t("detailHeading")}</h1>
      {faq && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">{faq.question}</h2>
          <p className="text-gray-700 mb-4">{faq.answer}</p>
          <p className="text-sm text-gray-600">
            {t("author")}: {faq.author?.name || t("unknown")}
          </p>
          <p className="text-sm text-gray-600">
            {t("created")}: {moment(faq.createdAt).format("LLL")}
          </p>
          <p className="text-sm text-gray-600">
            {t("updated")}: {moment(faq.updatedAt).format("LLL")}
          </p>
          <div className="mt-4 flex space-x-4">
            {/* <Link
              href={`/admin/faqs/edit/${id}`}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-  700"
            >
              Edit
            </Link>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Delete
            </button> */}
            <Link
              href="/admin/faqs"
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              {t("back")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default FAQDetail;
