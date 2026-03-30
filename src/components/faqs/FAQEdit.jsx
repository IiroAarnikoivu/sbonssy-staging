"use client";
import React, { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import api from "@/lib/axios";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Swal from "sweetalert2";
import { useTranslations } from "next-intl";
import Loader from "../Loader";

const FAQEdit = () => {
  const router = useRouter();
  const { id } = useParams();
  const [serverError, setServerError] = useState(null);
  const [loading, setLoading] = useState(true);
  const t = useTranslations("Admin.faqs");
  const toastAlert = useTranslations("Sweetalert");

  const formik = useFormik({
    initialValues: {
      question: "",
      answer: "",
    },
    validationSchema: Yup.object({
      question: Yup.string()
        .min(5, "Question must be at least 5 characters")
        .max(200, "Question cannot exceed 200 characters")
        .required("Question is required"),
      answer: Yup.string()
        .min(10, "Answer must be at least 10 characters")
        .required("Answer is required"),
    }),
    onSubmit: async (values) => {
      try {
        const result = await Swal.fire({
          title: toastAlert("updateFaqTxt"),
          showCancelButton: true,
          confirmButtonText: toastAlert("updateBtn"),
          cancelButtonText: toastAlert("cancel"),
        });
        const resp = await api.put(`/admin/faqs/${id}`, values);
        if (resp) {
          await Swal.fire({
            title: toastAlert("faqUpdated"),
            position: "top-right",
            icon: "success",
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
          router.push(`/admin/faqs`);
        }
      } catch (err) {
        setServerError("Failed to update FAQ. Please try again.");
      }
    },
  });

  useEffect(() => {
    (async () => {
      try {
        const resp = await api.get(`/admin/faqs/${id}`);
        const faq = resp.faq;
        formik.setValues({
          question: faq.question,
          answer: faq.answer,
        });
      } catch (err) {
        setServerError("Failed to load FAQ. Please try again later.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading)
    return (
      <div className="container mx-auto p-4">
        <Loader />
      </div>
    );
  if (serverError)
    return (
      <div className="container mx-auto p-4 text-red-700">{serverError}</div>
    );

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{t("edit")}</h1>
      <form
        onSubmit={formik.handleSubmit}
        className="bg-white p-6 rounded-lg shadow-md"
      >
        {/* Question */}
        <div className="mb-4">
          <label
            htmlFor="question"
            className="block text-sm font-medium text-gray-700"
          >
            {t("question")}
          </label>
          <input
            type="text"
            id="question"
            name="question"
            value={formik.values.question}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className={`mt-1 p-2 w-full border ${
              formik.touched.question && formik.errors.question
                ? "border-red-500"
                : "border-gray-300"
            } rounded-md`}
          />
          {formik.touched.question && formik.errors.question && (
            <div className="text-red-500 text-sm mt-1">
              {formik.errors.question}
            </div>
          )}
        </div>

        {/* Answer */}
        <div className="mb-4">
          <label
            htmlFor="answer"
            className="block text-sm font-medium text-gray-700"
          >
            {t("answer")}
          </label>
          <textarea
            id="answer"
            name="answer"
            value={formik.values.answer}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className={`mt-1 p-2 w-full border ${
              formik.touched.answer && formik.errors.answer
                ? "border-red-500"
                : "border-gray-300"
            } rounded-md h-40`}
          />
          {formik.touched.answer && formik.errors.answer && (
            <div className="text-red-500 text-sm mt-1">
              {formik.errors.answer}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={formik.isSubmitting}
            className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${
              formik.isSubmitting ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {t("update")}
          </button>
          <Link
            href={`/admin/faqs`}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            {t("cancel")}
          </Link>
        </div>
      </form>
    </div>
  );
};

export default FAQEdit;
