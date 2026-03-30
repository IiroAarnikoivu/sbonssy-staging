import { useTranslations } from "next-intl";
import React from "react";

const BrandInfo = ({ formik, next }) => {
  const t = useTranslations("onboardingBrand");
  return (
    <div>
      <div className="lg:mt-8 mt-7">
        <div className="text-center mb-6 lg:mb-8">
          <h2 className="text-[24px] lg:text-[32px]">{t("step1.heading")}</h2>
          <p className="text-base leading-[150%] tracking-[0%]">
            {t("step1.para")}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="mb-2 block ">{t("step1.firstNameLabel")}</label>
            <input
              name="firstName"
              value={formik.values.firstName}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="w-full border p-2 rounded"
              placeholder={t("step1.firstName")}
              type="text"
            />
            {formik.touched.firstName && formik.errors.firstName && (
              <p className="text-red-500 text-sm mt-1">
                {formik.errors.firstName}
              </p>
            )}
          </div>
          <div>
            <label className="mb-2 block ">{t("step1.lastNameLabel")}</label>
            <input
              name="lastName"
              value={formik.values.lastName}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="w-full border p-2 rounded"
              placeholder={t("step1.lastName")}
              type="text"
            />
            {formik.touched.lastName && formik.errors.lastName && (
              <p className="text-red-500 text-sm mt-1">
                {formik.errors.lastName}
              </p>
            )}
          </div>
        </div>

        <label className="mb-2 block ">{t("step1.label1")}</label>
        <input
          name="jobTitle"
          value={formik.values.jobTitle}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          placeholder={t("step1.jobTitle")}
          className="w-full border p-2 rounded"
          type="text"
        />
        {formik.touched.jobTitle && formik.errors.jobTitle && (
          <p className="text-red-500 text-sm mt-1">{formik.errors.jobTitle}</p>
        )}
      </div>
      <div>
        <label className="mb-2 block mt-6 lg:mt-[31px]">
          {t("step1.label2")}
        </label>
        <input
          name="companyName"
          value={formik.values.companyName}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          placeholder={t("step1.brandName")}
          className="w-full border p-2 rounded"
          type="text"
        />
        {formik.touched.companyName && formik.errors.companyName && (
          <p className="text-red-500 text-sm mt-1">
            {formik.errors.companyName}
          </p>
        )}
      </div>

      <div>
        <label className="mb-2 block mt-6 lg:mt-[31px]">
          {t("step1.label3")}
        </label>
        <input
          name="vatNumber"
          value={formik.values.vatNumber}
          type="text"
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          placeholder={t("step1.vatNumber")}
          className="w-full border p-2 rounded"
        />
        <p className="text-gray-500 text-sm mt-1">
          {t("step1.vatNumberHelper")}
        </p>
        {formik.touched.vatNumber && formik.errors.vatNumber && (
          <p className="text-red-500 text-sm mt-1">{formik.errors.vatNumber}</p>
        )}
      </div>
      <div>
        <label className="mb-2 block mt-6 lg:mt-[31px]">
          {" "}
          {t("step1.nameLabel")}
        </label>
        <input
          name="legalName"
          value={formik.values.legalName}
          type="text"
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          placeholder={t("step1.namePlaceholder")}
          className="w-full border p-2 rounded"
        />
        {formik.touched.legalName && formik.errors.legalName && (
          <p className="text-red-500 text-sm mt-1">{formik.errors.legalName}</p>
        )}
      </div>

      <div>
        <label className="mb-2 block mt-6 lg:mt-[31px]">
          {t("step1.addressLabel")}
        </label>

        <textarea
          name="address"
          value={formik.values?.address}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          placeholder={t("step1.addressPlaceholder")}
          className="min-h-[145px]"
        />
        {formik.touched.address && formik.errors.address && (
          <p className="text-red-500 text-sm mt-1">{formik.errors.address}</p>
        )}
      </div>
      <div>
        <label className="mb-2 block mt-6 lg:mt-[31px]">
          {t("step1.label4")}
        </label>
        <input
          name="websiteUrl"
          value={formik.values.websiteUrl}
          type="text"
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          className="w-full border p-2 rounded"
        />
        {formik.touched.websiteUrl && formik.errors.websiteUrl && (
          <p className="text-red-500 text-sm mt-1">
            {formik.errors.websiteUrl}
          </p>
        )}
      </div>
      <div>
        <label className="mb-2 block mt-6 lg:mt-[31px]">
          {t("step1.label5")}
        </label>

        <textarea
          name="companyIntro"
          value={formik.values?.companyIntro}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          placeholder={t("step1.introduction")}
          className="min-h-[145px]"
        />
        {formik.touched.companyIntro && formik.errors.companyIntro && (
          <p className="text-red-500 text-sm mt-1">
            {formik.errors.companyIntro}
          </p>
        )}
      </div>
      <div className="flex items-center justify-between lg:mt-8 mt-6 lg:mb-8 mb-4 ">
        <div className="flex items-center">
          <span>{t("step")} 1/3</span>
        </div>

        <button onClick={next} className="primaryBtn">
          {t("next")}
        </button>
      </div>
    </div>
  );
};

export default BrandInfo;
