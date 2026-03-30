"use client";
import React, { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import api from "@/lib/axios";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { useTranslations } from "next-intl";

const FAQAdd = () => {
  const router = useRouter();
  const [serverError, setServerError] = useState(null);
  const t = useTranslations("Admin.faqs");

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
        await api.post("/admin/faqs", values);
        router.push("/admin/faqs");
      } catch (err) {
        setServerError("Failed to create FAQ. Please try again.");
      }
    },
  });

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{t("link")}</h1>
      {serverError && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          {serverError}
        </div>
      )}
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
            className={`px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 ${
              formik.isSubmitting ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {t("createFaq")}
          </button>
          <Link
            href="/admin/faqs"
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            {t("cancel")}
          </Link>
        </div>
      </form>
    </div>
  );
};

export default FAQAdd;
