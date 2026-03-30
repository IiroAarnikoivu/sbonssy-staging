"use client";

import { useTranslations } from "next-intl";
import { useAuthStore } from "@/store/authStore";
import { useEffect, useState } from "react";

const CompensationStep = ({
  values,
  errors,
  touched,
  handleChange,
  handleBlur,
  setFieldValue,
}) => {
  const t = useTranslations("Brand.campaignCreate.step2");
  const { user } = useAuthStore();

  // Check if user has Shopify integration from the store
  const shopifyDetails = user?.onboardedDetails?.brand?.shopifyDetails;
  const hasShopifyIntegration = shopifyDetails?.myShopifyDomain;

  // Rule: Only pay-per-sale is allowed when Shopify is integrated AND products are selected in Step 2
  const hasSelectedProducts =
    Array.isArray(values?.products) && values.products.length > 0;
  const restrictToPPS = Boolean(hasShopifyIntegration && hasSelectedProducts);

  // If restriction applies and a non-allowed compensation type is set, force pay-per-sale
  useEffect(() => {
    if (restrictToPPS && values?.compensation?.type !== "pay-per-sale") {
      setFieldValue("compensation.type", "pay-per-sale");
      // Reset fields to keep consistent state
      setFieldValue("compensation.amount", "");
    }
  }, [restrictToPPS]);

  // Initialize auth store if needed
  useEffect(() => {
    if (!user) {
      useAuthStore.getState().initialize();
    }
  }, [user]);

  const compensationTypes = [
    {
      id: "pay-per-sale",
      label: t("type.one"),
      description: [
        t("sale.one"),
        t("sale.two"),
        t("sale.three"),
        t("sale.four"),
        t("sale.five"),
        t("sale.six"),
        t("sale.seven"),
        t("sale.eight"),
      ],
      disabled: false,
    },
    {
      id: "pay-per-lead",
      label: t("type.two"),
      description: [
        t("lead.one"),
        t("lead.two"),
        t("lead.three"),
        t("lead.four"),
        t("lead.five"),
        t("lead.six"),
        t("lead.seven"),
        t("lead.eight"),
      ],
      disabled: restrictToPPS, // Only pay-per-sale allowed when Shopify + products selected
    },
    {
      id: "pay-per-click",
      label: t("type.three"),
      description: [
        t("click.one"),
        t("click.two"),
        t("click.three"),
        t("click.four"),
        t("click.five"),
        t("click.six"),
        t("click.seven"),
        t("click.eight"),
      ],
      disabled: restrictToPPS, // Only pay-per-sale allowed when Shopify + products selected
    },
    // {
    //   id: "flat-fee",
    //   label: t("type.four"),
    //   description: [
    //     t("flat.one"),
    //     t("flat.two"),
    //     t("flat.three"),
    //     t("flat.four"),
    //     t("flat.five"),
    //     t("flat.six"),
    //     t("flat.seven"),
    //     t("flat.eight"),
    //   ],
    //   disabled: restrictToPPS, // Only pay-per-sale allowed when Shopify + products selected
    // },
  ];
  const cookieDurations = [
    { value: 14, label: `14 ${t("days")}` },
    { value: 30, label: `30 ${t("days")}` },
    { value: 60, label: `60 ${t("days")}` },
  ];

  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="space-y-6">
      <div className="text-center mb-6 lg:mb-8">
        <h2 className="text-[24px] lg:text-[32px]">{t("heading")}</h2>
        <p className="text-base leading-[150%] tracking-[0%]">
          {t("subHeading")}
        </p>
      </div>
      <h2 className="text-xl font-semibold text-gray-800 mb-2">
        {t("heading")}
      </h2>

      {restrictToPPS && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                {t("restrictionText")}
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>{t("restrictionPara")}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6">
        <label className="block mb-2 text-gray-700">{t("label")}</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
          {compensationTypes.map((type) => (
            <label
              key={type.id}
              className={`p-4 border rounded-lg cursor-pointer bg-[rgba(12,_13,_6,_0.05)] ${
                values.compensation.type === type.id
                  ? "bg-[rgba(12,_13,_6,_0.05)]"
                  : ""
              } ${type.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="flex items-start">
                <input
                  type="radio"
                  name="compensation.type"
                  value={type.id}
                  checked={values.compensation.type === type.id}
                  onChange={(e) => {
                    setFieldValue("compensation.type", e.target.value);
                    setFieldValue("compensation.commission", "");
                    setFieldValue("compensation.amount", "");
                  }}
                  onBlur={handleBlur}
                  className="mt-1 h-4 w-4 text-[#f26915] rounded"
                  disabled={type.disabled}
                />
                <div className="ml-3">
                  <span className="block text-gray-800 font-medium">
                    {type.label}
                  </span>
                  {values.compensation.type === type.id && (
                    <div className="mt-2 text-sm text-gray-500 space-y-1">
                      {type.description.map((line, index) => (
                        <p key={index}>{line}</p>
                      ))}
                    </div>
                  )}
                  {/* No extra helper text when disabled */}
                </div>
              </div>
            </label>
          ))}
        </div>
        <p className="block my-4 text-gray-500 ">{t("stripe")}</p>
        {touched.compensation?.type && errors.compensation?.type && (
          <p className="mt-1 text-sm text-red-600">
            {errors.compensation.type}
          </p>
        )}
      </div>

      {values.compensation.type === "pay-per-sale" && (
        <div className="mt-6 md:mt-[55px]">
          <div className="flex items-center gap-2 mb-2">
            <label className="block text-gray-700">{t("rate")}</label>
            <button
              type="button"
              onClick={() => setShowTooltip(true)}
              className="inline-flex items-center justify-center w-5 h-5 text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                />
              </svg>
            </button>
          </div>

          {/* Modal Popup */}
          {showTooltip && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowTooltip(false)}>
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{t("rate")}</h3>
                  <button
                    type="button"
                    onClick={() => setShowTooltip(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-6 h-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
                <p className="text-gray-700 mb-4 text-sm leading-relaxed">
                  {t("rateTooltip.intro")}
                </p>
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">{t("rateTooltip.apparel").split(":")[0]}</span>
                    <span className="font-medium text-gray-900">{t("rateTooltip.apparel").split(":")[1]}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">{t("rateTooltip.fitness").split(":")[0]}</span>
                    <span className="font-medium text-gray-900">{t("rateTooltip.fitness").split(":")[1]}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">{t("rateTooltip.supplements").split(":")[0]}</span>
                    <span className="font-medium text-gray-900">{t("rateTooltip.supplements").split(":")[1]}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">{t("rateTooltip.digital").split(":")[0]}</span>
                    <span className="font-medium text-gray-900">{t("rateTooltip.digital").split(":")[1]}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="relative">
            <input
              type="number"
              name="compensation.commission"
              value={values.compensation.commission}
              onChange={handleChange}
              onBlur={handleBlur}
              className="w-full p-3 border rounded-lg bg-[rgba(12,_13,_6,_0.05)]"
              placeholder="10"
              min="0"
              max="100"
              step="0.1"
              disabled={false}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
              %
            </div>
          </div>
          {touched.compensation?.commission &&
            errors.compensation?.commission && (
              <p className="mt-1 text-sm text-red-600">
                {errors.compensation.commission}
              </p>
            )}
        </div>
      )}

      {["pay-per-lead", "pay-per-click", "flat-fee"].includes(
        values.compensation.type,
      ) && (
        <div className="mt-6 md:mt-[55px]">
          <label className="block mb-2 text-gray-700">
            {values.compensation.type === "flat-fee"
              ? t("type.five")
              : values.compensation.type === "pay-per-lead"
                ? t("type.two")
                : t("type.three")}
          </label>
          <div className="relative">
            <input
              type="number"
              name="compensation.amount"
              value={values.compensation.amount}
              onChange={handleChange}
              onBlur={handleBlur}
              onWheel={(e) => {
                // Prevent mouse wheel from changing number input value
                e.preventDefault();
                e.stopPropagation();
                // Blur to ensure browsers that ignore preventDefault on number inputs don't step
                e.currentTarget.blur();
              }}
              className="w-full p-3 border rounded-lg bg-[rgba(12,_13,_6,_0.05)] cursor-pointer"
              placeholder={
                values.compensation.type === "pay-per-click" ? "0.50" : "5"
              }
              min="0"
              step={values.compensation.type === "pay-per-click" ? "0.01" : "1"}
              disabled={restrictToPPS}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
              €
            </div>
          </div>
          {touched.compensation?.amount && errors.compensation?.amount && (
            <p className="mt-1 text-sm text-red-600">
              {errors.compensation.amount}
            </p>
          )}
        </div>
      )}

      {!(values.compensation.type === "pay-per-sale" && hasSelectedProducts) && (
        <div className="mt-6 md:mt-[55px]">
          <label className="block mb-1">{t("affiliate")}</label>
          <p className="text-sm text-gray-500 mb-3">{t("affiliateHelper")}</p>
          <input
            type="text"
            name="compensation.affiliateLinkDestination"
            value={values.compensation.affiliateLinkDestination}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={t("affiliatePlaceholder")}
            className="forms w-full border p-2 rounded cursor-pointer"
          />
          {(() => {
            const isPPS = values.compensation.type === "pay-per-sale";
            const optional = restrictToPPS && isPPS;
            const val = values.compensation.affiliateLinkDestination?.trim();
            const isEmpty = !val || val === "https://" || val === "http://";
            const shouldShowError =
              touched.compensation?.affiliateLinkDestination &&
              errors.compensation?.affiliateLinkDestination &&
              // suppress error when optional and empty
              !(optional && isEmpty);
            return (
              shouldShowError && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.compensation.affiliateLinkDestination}
                </p>
              )
            );
          })()}
        </div>
      )}

      {/* Add this new section for Cookie Duration */}
      <div className="mt-6 md:mt-[55px]">
        <label className="block mb-1">{t("cookie")}</label>
        <p className="text-sm text-gray-500 mb-3">{t("para2")}</p>
        <select
          name="compensation.duration"
          value={values.compensation.duration || ""}
          onChange={handleChange}
          onBlur={handleBlur}
          className="dropdownIcon w-full h-[48px] py-2 px-3 bg-[#F3F3F2] rounded-[12px] border-0 focus:outline-none focus:ring-0 hover:border-0 cursor-pointer"
        >
          <option value="" disabled>
            {t("duration")}
          </option>
          {cookieDurations.map((duration) => (
            <option key={duration.value} value={duration.value}>
              {duration.label}
            </option>
          ))}
        </select>
        {touched.compensation?.duration && errors.compensation?.duration && (
          <p className="mt-1 text-sm text-red-600">
            {errors.compensation.duration}
          </p>
        )}
      </div>
      <div className="mt-6 md:mt-[55px]">
        <label className="flex items-center space-x-3">
          <div className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="compensation.gifting"
              checked={values.compensation.gifting}
              onChange={handleChange}
              onBlur={handleBlur}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#f26915]"></div>
          </div>
          <span className="text-gray-700 font-medium">{t("gifting")}</span>
        </label>
        <p className="mt-6 text-sm text-gray-500">{t("para")}</p>
      </div>
    </div>
  );
};

export default CompensationStep;
