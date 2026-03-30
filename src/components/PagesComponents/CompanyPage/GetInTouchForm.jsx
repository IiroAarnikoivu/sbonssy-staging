"use client";

import CustomDropdown from "@/components/Common/CustomDropdown/CustomDropdown";
import DefaultLayout from "@/components/Common/DefaultLayout.jsx/DefaultLayout";
import api from "@/lib/axios";
import { useFormik } from "formik";
import { useTranslations, useLocale } from "next-intl";
import React, { useState, useMemo } from "react";
import Swal from "sweetalert2";
import * as Yup from "yup";
import { configureYupLocale } from "@/lib/yupLocales";

export default function GetInTouchForm() {
  const t = useTranslations("Company");
  const toastAlert = useTranslations("Sweetalert");
  const locale = useLocale();
  const [selected, setSelected] = useState("");
  const options = [
    { label: t("formData.options.one"), value: "1" },
    { label: t("formData.options.two"), value: "2" },
    { label: t("formData.options.three"), value: "3" },
  ];

  const roles = [
    { id: "sportsAmbassador", label: t("formData.role.one") },
    { id: "fan", label: t("formData.role.two") },
    // { id: "otherInquiry", label: t("formData.role.three") },
    { id: "brandPartner", label: t("formData.role.four") },
    { id: "mediaInquiry", label: t("formData.role.five") },
    { id: "other", label: t("formData.role.six") },
  ];

  // Configure Yup for current locale and memoize schema
  const normLocale =
    (typeof locale === "string" && locale.split("-")?.[0]) || locale;
  configureYupLocale(normLocale);
  const validationSchema = useMemo(
    () =>
      Yup.object({
        firstName: Yup.string()
          .required()
          .label(t("formData.formContent.firstName")),
        lastName: Yup.string()
          .required()
          .label(t("formData.formContent.lastName")),
        email: Yup.string()
          .email()
          .required()
          .label(t("formData.formContent.email")),
        phone: Yup.string().label(t("formData.formContent.phnNumber")),
        role: Yup.string().required().label(t("formData.formContent.role")),
        message: Yup.string().required().label(t("formData.formContent.msg")),
        agree: Yup.boolean()
          .oneOf([true])
          .label(t("formData.formContent.agreeMsg")),
      }),
    [normLocale, t]
  );

  const formik = useFormik({
    initialValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",

      role: "",
      message: "",
      agree: false,
    },
    validationSchema,
    onSubmit: async (values) => {
      // Handle form submission

      const resp = await api.post("/inquiry", values);
      if (resp) {
        Swal.fire({
          title: toastAlert("inquirySent"),
          icon: "success",
          position: "top-right",
          showConfirmButton: false,
          timer: 2000,
          toast: true,
        });
      }
    },
  });

  return (
    <div>
      <DefaultLayout styling={"py-[64px] lg:py-[112px]"}>
        <div className="text-center mb-12 lg:mb-20">
          <span className="text-base font-bold  leading-[150%] block mb-2 lg:mb-4">
            {t("formData.header.subHeading")}
          </span>
          <h3 className="leading-[120%] tracking-[-1%] font-[400] text-[32px] lg:text-[40px]">
            {t("formData.header.heading")}
          </h3>

          <p className="text-base  tracking-[0%] leading-[150%] mt-5 lg:text-lg">
            {t("formData.header.para")}
          </p>
        </div>

        {/* form  */}
        <form
          onSubmit={formik.handleSubmit}
          className="grid grid-cols-2 gap-6 getInTouchForm max-w-[768px] mx-auto"
        >
          {/* First Name */}
          <div className="">
            <label htmlFor="firstName">
              {t("formData.formContent.firstName")}
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              className=""
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.firstName}
            />
            {formik.touched.firstName && formik.errors.firstName ? (
              <div className="text-red-500 text-sm">
                {formik.errors.firstName}
              </div>
            ) : null}
          </div>

          {/* Last Name */}
          <div className="">
            <label htmlFor="lastName">
              {t("formData.formContent.lastName")}
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              className=""
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.lastName}
            />
            {formik.touched.lastName && formik.errors.lastName ? (
              <div className="text-red-500 text-sm">
                {formik.errors.lastName}
              </div>
            ) : null}
          </div>

          {/* Email */}
          <div className="col-span-2 lg:col-span-1">
            <label htmlFor="email">{t("formData.formContent.email")}</label>
            <input
              type="email"
              id="email"
              name="email"
              className=""
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.email}
            />
            {formik.touched.email && formik.errors.email ? (
              <div className="text-red-500 text-sm">{formik.errors.email}</div>
            ) : null}
          </div>

          {/* Phone */}
          <div className="col-span-2 lg:col-span-1">
            <label htmlFor="phone">{t("formData.formContent.phnNumber")}</label>
            <input
              type="text"
              id="phone"
              name="phone"
              className=""
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.phone}
            />
          </div>

          {/* Topic */}
          {/* <div className="col-span-2">
            <label htmlFor="topic">{t("formData.formContent.topic")}</label>
            <CustomDropdown
              id="topic"
              name="topic"
              options={options}
              placeholder={t("formData.formContent.placeholderDropDown")}
              value={formik.values.topic}
              onChange={(value) => {
                setSelected(value);
                formik.setFieldValue("topic", value);
              }}
              onBlur={formik.handleBlur}
            />
            {formik.touched.topic && formik.errors.topic ? (
              <div className="text-red-500 text-sm">{formik.errors.topic}</div>
            ) : null}
          </div> */}

          {/* Role */}
          <div className="col-span-2">
            <label>{t("formData.formContent.role")}</label>
            <div className="grid grid-cols-2 gap-[14px]">
              {roles.map((role) => (
                <div key={role.id} className="flex items-center gap-[14px]">
                  <label className="radio-wrapper">
                    <input
                      id={role.id}
                      type="radio"
                      name="role"
                      value={role.id}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      checked={formik.values.role === role.id}
                    />
                    <span className="custom-radio"></span>
                    <span className="ms-3">{role.label}</span>
                  </label>
                </div>
              ))}
            </div>
            {formik.touched.role && formik.errors.role ? (
              <div className="text-red-500 text-sm">{formik.errors.role}</div>
            ) : null}
          </div>

          {/* Message */}
          <div className="col-span-2">
            <label htmlFor="message">{t("formData.formContent.msg")}</label>
            <textarea
              id="message"
              name="message"
              type="text"
              className="min-h-[180px] p-4"
              placeholder={t("formData.formContent.placeholderMsg")}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.message}
            />
            {formik.touched.message && formik.errors.message ? (
              <div className="text-red-500 text-sm">
                {formik.errors.message}
              </div>
            ) : null}
          </div>

          {/* Agreement */}
          <div className="col-span-2">
            <label className="checkbox-wrapper flex items-center">
              <input
                type="checkbox"
                name="agree"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                checked={formik.values.agree}
              />
              <span className="custom-checkbox"></span>
              <span className="pl-3 -mt-1">
                {t("formData.formContent.agreeMsg")}{" "}
                <a href="/privacy-policy">
                  {" "}
                  {t("formData.formContent.policy")}
                </a>
              </span>
            </label>
            {formik.touched.agree && formik.errors.agree ? (
              <div className="text-red-500 text-sm">{formik.errors.agree}</div>
            ) : null}
          </div>

          {/* Submit Button */}
          <div className="col-span-2">
            <button
              type="submit"
              className="mx-auto primaryBtnPurple text-white w-fit"
              disabled={formik.isSubmitting}
            >
              {t("formData.formContent.btn")}
            </button>
          </div>
        </form>
      </DefaultLayout>
    </div>
  );
}
