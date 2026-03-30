"use client";

import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
const Select = dynamic(() => import("react-select"), { ssr: false });

const CreatorProfileStep = ({
  values,
  errors,
  touched,
  handleChange,
  handleBlur,
  setFieldValue,
  platformOptions,
  ambassadorTypeOptions,
}) => {
  const t = useTranslations("Brand.campaignCreate.step3");
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        {t("heading")}
      </h2>

      <div className="grid grid-cols-2 gap-4 mt-6">
        <div>
          <label className="block mb-2 text-gray-700">{t("min")}</label>
          <input
            type="number"
            name="creatorProfile.followerRange.min"
            value={values.creatorProfile.followerRange.min}
            onChange={handleChange}
            onBlur={handleBlur}
            className="forms w-full p-3 border rounded-lg focus:ring-gray-500 focus:border-gray-500 cursor-pointer"
            placeholder="1000"
            min="0"
          />
          {touched.creatorProfile?.followerRange?.min &&
            errors.creatorProfile?.followerRange?.min && (
              <p className="mt-1 text-sm text-red-600">
                {errors.creatorProfile.followerRange.min}
              </p>
            )}
        </div>
        <div>
          <label className="block mb-2 text-gray-700 cursor-pointer">
            {t("max")}
          </label>
          <input
            type="number"
            name="creatorProfile.followerRange.max"
            value={values.creatorProfile.followerRange.max}
            onChange={handleChange}
            onBlur={handleBlur}
            className="forms w-full p-3 border rounded-lg focus:ring-gray-500 focus:border-gray-500 cursor-pointer"
            placeholder="100000"
            min={values.creatorProfile.followerRange.min || 0}
          />
          {touched.creatorProfile?.followerRange?.max &&
            errors.creatorProfile?.followerRange?.max && (
              <p className="mt-1 text-sm text-red-600">
                {errors.creatorProfile.followerRange.max}
              </p>
            )}
        </div>
      </div>

      <div className="mt-6 md:mt-[55px]">
        <label className="block mb-2 text-gray-700">{t("platforms")}</label>
        <Select
          value={values.creatorProfile.platforms}
          isMulti
          options={platformOptions}
          onChange={(selected) =>
            setFieldValue("creatorProfile.platforms", selected || [])
          }
          onBlur={() => handleBlur("creatorProfile.platforms")}
          className="basic-multi-select"
          classNamePrefix="select"
          placeholder={t("placeholder")}
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
          }}
        />
        {touched.creatorProfile?.platforms &&
          errors.creatorProfile?.platforms && (
            <p className="mt-1 text-sm text-red-600">
              {errors.creatorProfile.platforms}
            </p>
          )}
      </div>

      <div className="mt-6 md:mt-[55px]">
        <label className="block mb-2 text-gray-700">{t("types")}</label>
        <Select
          value={values.creatorProfile.ambassadorTypes}
          isMulti
          options={ambassadorTypeOptions}
          onChange={(selected) =>
            setFieldValue("creatorProfile.ambassadorTypes", selected || [])
          }
          onBlur={() => handleBlur("creatorProfile.ambassadorTypes")}
          className="basic-multi-select"
          classNamePrefix="select"
          placeholder={t("placeholder2")}
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
          }}
        />
        {touched.creatorProfile?.ambassadorTypes &&
          errors.creatorProfile?.ambassadorTypes && (
            <p className="mt-1 text-sm text-red-600">
              {errors.creatorProfile.ambassadorTypes}
            </p>
          )}
      </div>
    </div>
  );
};

export default CreatorProfileStep;
