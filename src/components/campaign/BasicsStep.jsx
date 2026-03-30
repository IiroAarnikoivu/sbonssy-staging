"use client";

import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import DropdownIndicator from "../DropdownIndicator";
const Select = dynamic(() => import("react-select"), { ssr: false });

const BasicsStep = ({
  values,
  errors,
  touched,
  handleChange,
  handleBlur,
  setFieldValue,
  regionOptions,
  handleFileUpload,
  uploading,
}) => {
  const t = useTranslations("Brand.campaignCreate");
  const todayISO = new Date().toISOString().slice(0, 10);

  const campaignType = [
    {
      key: t("step1.type.one"),
      value: "public",
      description: t("step1.typePara.one"),
    },
    {
      key: t("step1.type.two"),
      value: "apply",
      description: t("step1.typePara.two"),
    },
    {
      key: t("step1.type.three"),
      value: "private",
      description: t("step1.typePara.three"),
    },
  ];

  const category = [
    { key: t("step1.category.Apparel"), value: "apparel" },
    { key: t("step1.category.Technology"), value: "technology" },
    { key: t("step1.category.Nutrition"), value: "nutrition" },
    { key: t("step1.category.Wellness"), value: "wellness" },
    { key: t("step1.category.Footwear"), value: "footwear" },
    { key: t("step1.category.Services"), value: "services" },
    { key: t("step1.category.Media"), value: "media_content" },
    {
      key: t("step1.category.Outdoor"),
      value: "outdoor_adventure_gear",
    },
    {
      key: t("step1.category.Events"),
      value: "events_experiences",
    },
    {
      key: t("step1.category.Accessories"),
      value: "accessories_equipment",
    },
    { key: t("step1.category.Other"), value: "other" },
  ];

  const offerType = [
    { key: t("step1.offerType.Product"), value: "product" },
    { key: t("step1.offerType.Service"), value: "service" },
  ];

  const renderPreview = (items) => {
    if (items.length === 0) return null;

    return (
      <div className="mt-3">
        <h4 className="text-sm font-medium text-gray-700 mb-1">
          {t("step1.renderheading")}
        </h4>
        <div className="flex flex-wrap gap-2">
          {items.map((item, index) => (
            <div key={index} className="relative group">
              {item.url ? (
                <img
                  src={item.url}
                  alt="Cover preview"
                  className="h-20 w-20 object-cover rounded"
                />
              ) : (
                <div className="h-20 w-20 bg-gray-200 rounded flex items-center justify-center text-sm text-gray-500">
                  {t("step1.invalid")}
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  const updatedCoverImages = values.basics.coverImages.filter(
                    (_, i) => i !== index
                  );
                  setFieldValue("basics.coverImages", updatedCoverImages);
                }}
                className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove cover image"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const handleImageSelect = (event) => {
    handleFileUpload(event, "coverImages");
  };

  return (
    <div className="">
      <div className="text-center mb-6 lg:mb-8">
        <h2 className="text-[24px] lg:text-[32px]">{t("step1.heading")}</h2>
        <p className="text-base leading-[150%] tracking-[0%]">
          {t("step1.subHeading")}
        </p>
      </div>
      <div>
        <label className="block mb-2 text-gray-700">{t("step1.label1")}</label>
        <div className="grid grid-cols-3 gap-4">
          {campaignType.map((type) => (
            <label
              key={type.key}
              className="flex items-center space-x-2 p-3 border border-[#f26915] rounded-lg hover:bg-gray-50"
            >
              <input
                type="radio"
                id={`campaignType-${type.value}`}
                name="basics.campaignType"
                value={type.value}
                checked={values.basics.campaignType === type.value}
                onChange={handleChange}
                onBlur={handleBlur}
                className="h-4 w-4 text-[#f26915]"
              />
              <span className="capitalize">{type.key}</span>
            </label>
          ))}
        </div>
        {values.basics.campaignType && (
          <p className="mt-2 text-sm text-gray-500">
            {
              campaignType.find(
                (type) => type.value === values.basics.campaignType
              )?.description
            }
          </p>
        )}
        {touched.basics?.campaignType && errors.basics?.campaignType && (
          <p className="mt-1 text-sm text-red-600">
            {errors.basics.campaignType}
          </p>
        )}
      </div>

      <div className="mt-6 md:mt-[55px]">
        <label htmlFor="category" className="block mb-2">
          {t("step1.label2")}
        </label>
        <select
          id="category"
          name="basics.category"
          value={values.basics.category}
          onChange={handleChange}
          onBlur={handleBlur}
          className="dropdownIcon w-full h-[48px] py-2 px-3 bg-[#F3F3F2] rounded-[12px] border-0 focus:outline-none focus:ring-0 hover:border-0 cursor-pointer"
        >
          {category.map((type) => (
            <option key={type.key} value={type.value} className="capitalize">
              {type.key}
            </option>
          ))}
        </select>
        {touched.basics?.category && errors.basics?.category && (
          <p className="text-red-500 text-sm mt-1">{errors.basics.category}</p>
        )}
      </div>

      {/* <div className="mt-6 md:mt-[55px]">
        <label className="block mb-2">{t("step1.label")}</label>
        <div className="flex gap-4">
          {offerType.map((type) => (
            <div key={type.key} className="flex items-center">
              <input
                type="radio"
                id={`offerType-${type.value}`}
                name="basics.offerType"
                value={type.value}
                checked={values.basics.offerType === type.value}
                onChange={handleChange}
                onBlur={handleBlur}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label
                htmlFor={`offerType-${type.value}`}
                className="ml-2 capitalize cursor-pointer"
              >
                {type.key}
              </label>
            </div>
          ))}
        </div>
        {touched.basics?.offerType && errors.basics?.offerType && (
          <p className="text-red-500 text-sm mt-1">{errors.basics.offerType}</p>
        )}
      </div> */}

      <div className="mt-6 md:mt-[55px]">
        <label className="block mb-2">{t("step1.label3")}</label>
        <input
          type="text"
          name="basics.title"
          value={values.basics.title}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={t("step1.placeholder1")}
          className="forms w-full border p-2 rounded cursor-pointer"
        />
        {/* <p className="mt-1 text-xs text-gray-500">{t("step1.para1")}</p> */}
        {touched.basics?.title && errors.basics?.title && (
          <p className="text-red-500 text-sm mt-1">{errors.basics.title}</p>
        )}
      </div>

      <div className="mt-6 md:mt-[55px]">
        <label className="block mb-1">{t("step1.label4")}</label>
        <p className="mt-1 mb-2 text-xs text-gray-500">{t("step1.para2")}</p>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
          <input
            type="file"
            onChange={handleImageSelect}
            accept="image/*"
            className="hidden cursor-pointer"
            id="cover-image-upload"
          />
          <label
            htmlFor="cover-image-upload"
            className="cursor-pointer flex flex-col items-center justify-center"
          >
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="mt-2 block text-sm font-medium text-gray-700">
              {uploading?.coverImages
                ? t("step1.uploading")
                : t("step1.upload")}
            </span>
            <span className="mt-1 text-xs text-gray-500">
              {t("step1.imgFormat")}
            </span>
          </label>
        </div>
        {touched.basics?.coverImages && errors.basics?.coverImages && (
          <p className="mt-1 text-sm text-red-600">
            {typeof errors.basics.coverImages === "string"
              ? errors.basics.coverImages
              : "Invalid cover image"}
          </p>
        )}
        {renderPreview(values.basics.coverImages)}
      </div>

      <div className="mt-6 md:mt-[55px]">
        <label className="block mb-2">{t("step1.label5")}</label>
        <textarea
          name="basics.description"
          value={values.basics.description}
          onChange={handleChange}
          onBlur={handleBlur}
          className="forms w-full p-3 border rounded-lg focus:ring-gray-500 focus:border-gray-500 !h-auto cursor-pointer"
          rows={4}
          placeholder={t("step1.placeholder2")}
        />
        {touched.basics?.description && errors.basics?.description && (
          <p className="text-red-500 text-sm mt-1">
            {errors.basics.description}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 md:mt-[55px]">
        <div>
          <label className="block mb-2">{t("step1.label6")}</label>
          <input
            type="date"
            name="basics.startDate"
            value={values.basics.startDate}
            onChange={handleChange}
            onBlur={handleBlur}
            className="w-full p-3 rounded-[12px] bg-[rgba(12,13,6,0.05)] border border-transparent focus:outline-none focus:border-transparent hover:border-transparent cursor-pointer"
            // disabled={values.basics.isOngoing}
            min={todayISO}
          />
          {touched.basics?.startDate && errors.basics?.startDate && (
            <p className="text-red-500 text-sm mt-1">
              {errors.basics.startDate}
            </p>
          )}
        </div>
        <div>
          <label className="block mb-2">{t("step1.label7")}</label>
          <input
            type="date"
            name="basics.endDate"
            value={values.basics.isOngoing ? "" : values.basics.endDate || ""}
            onChange={handleChange}
            onBlur={handleBlur}
            className="w-full p-3 rounded-[12px] bg-[rgba(12,13,6,0.05)] border border-transparent focus:outline-none focus:border-transparent hover:border-transparent cursor-pointer"
            disabled={values.basics.isOngoing}
            min={values.basics.startDate}
          />
          {touched.basics?.endDate && errors.basics?.endDate && (
            <p className="text-red-500 text-sm mt-1">{errors.basics.endDate}</p>
          )}
        </div>
      </div>

      <div className="flex items-center mt-6 md:mt-[55px] mb-2">
        <input
          type="checkbox"
          name="basics.isOngoing"
          checked={values.basics.isOngoing}
          onChange={(e) => {
            const checked = e.target.checked;
            setFieldValue("basics.isOngoing", checked);
            if (checked) {
              // Clear endDate when ongoing is enabled
              setFieldValue("basics.endDate", null, false);
            }
          }}
          onBlur={handleBlur}
          className="h-4 w-4 text-[#f26915] rounded"
        />
        <label className="ml-2 text-gray-500">{t("step1.label8")}</label>
      </div>

      <div className="mt-6 md:mt-[55px]">
        <label className="block mb-2">{t("step1.label9")}</label>
        <Select
          value={values.basics.targetRegions}
          isMulti
          options={regionOptions}
          onChange={(selected) => {
            setFieldValue("basics.targetRegions", selected || []);
          }}
          onBlur={() =>
            handleBlur({ target: { name: "basics.targetRegions" } })
          }
          placeholder={t("step1.placeholder3")}
          classNamePrefix="select"
          menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
          styles={{
            control: (provided, state) => ({
              ...provided,
              backgroundColor: "rgba(12,13,6,0.05)",
              minHeight: "48px",
              borderRadius: "12px",
              ":hover": {
                backgroundColor: "rgba(12,13,6,0.05)",
                borderColor: "transparent",
              },
              ...(state.isFocused && {
                borderColor: "transparent",
                boxShadow: "none",
                outline: "none",
              }),
            }),
            multiValue: (provided) => ({
              ...provided,
              backgroundColor: "rgba(255, 0, 0, 0.2)",
            }),
            indicatorSeparator: () => ({
              display: "none", // Removes the separator
            }),
            menuPortal: (provided) => ({
              ...provided,
              zIndex: 9999,
            }),
          }}
          components={{ DropdownIndicator }}
        />
        {touched.basics?.targetRegions && errors.basics?.targetRegions && (
          <p className="text-red-500 text-sm mt-1">
            {errors.basics.targetRegions}
          </p>
        )}
      </div>
    </div>
  );
};

export default BasicsStep;
