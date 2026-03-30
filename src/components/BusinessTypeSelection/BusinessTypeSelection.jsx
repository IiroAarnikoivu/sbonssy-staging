"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

const BusinessTypeSelection = ({ onSelect, selectedType, disabled = false }) => {
  const t = useTranslations("BusinessType");
  
  const businessTypes = [
    {
      value: "individual",
      titleKey: "individual.title",
      descriptionKey: "individual.description",
    },
    {
      value: "company",
      titleKey: "company.title", 
      descriptionKey: "company.description",
    },
  ];

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          {t("title")}
        </h2>
        <p className="text-gray-600">
          {t("subtitle")}
        </p>
      </div>

      <div className="space-y-4">
        {businessTypes.map((type) => (
          <div
            key={type.value}
            className={`relative border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
              selectedType === type.value
                ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            onClick={() => !disabled && onSelect(type.value)}
          >
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  type="radio"
                  name="businessType"
                  value={type.value}
                  checked={selectedType === type.value}
                  onChange={() => !disabled && onSelect(type.value)}
                  disabled={disabled}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-medium text-gray-900">
                  {t(type.titleKey)}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {t(type.descriptionKey)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedType && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-800">
                {t("selected", { type: t(`${selectedType}.title`) })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessTypeSelection;
