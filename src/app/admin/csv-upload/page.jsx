"use client";

import React from "react";
import CSVUpload from "@/components/admin/CSVUpload";
import { useTranslations } from "next-intl";

const CSVUploadPage = () => {
  const t = useTranslations("csv");
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">{t("heading")}</h1>
            <p className="mt-2 text-gray-600">{t("desc")}</p>
          </div>

          <CSVUpload />

          {/* Instructions */}
          <div className="mt-12 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {t("instructionHeading")}
            </h2>

            <div className="space-y-4 text-gray-700">
              <div>
                <h3 className="font-medium text-gray-900">
                  {t("creationHeading")}
                </h3>
                <ul className="mt-2 list-disc list-inside space-y-1 text-sm">
                  <li>{t("creationSteps.one")}</li>
                  <li>{t("creationSteps.two")}</li>
                  <li>{t("creationSteps.three")}</li>
                  <li>{t("creationSteps.four")}</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-gray-900">
                  {t("mappingHeading")}
                </h3>
                <ul className="mt-2 list-disc list-inside space-y-1 text-sm">
                  <li>
                    <strong>{t("role.one.label")}</strong> {t("role.one.head")}
                  </li>
                  <li>
                    <strong>{t("role.two.label")}</strong> {t("role.two.head")}
                  </li>
                  <li>
                    <strong>{t("role.three.label")}</strong>{" "}
                    {t("role.three.head")}
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-gray-900">
                  {t("error.heading")}
                </h3>
                <ul className="mt-2 list-disc list-inside space-y-1 text-sm">
                  <li>{t("error.steps.one")}</li>
                  <li>{t("error.steps.two")}</li>
                  <li>{t("error.steps.three")}</li>
                  <li>{t("error.steps.four")}</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-gray-900">
                  {t("format.heading")}
                </h3>
                <div className="mt-2 space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {t("format.simple.heading")}
                    </p>
                    <div className="bg-gray-50 p-3 rounded text-xs font-mono overflow-x-auto">
                      <div>{t("format.simple.desc.one")}</div>
                      <div>{t("format.simple.desc.two")}</div>
                      <div>{t("format.simple.desc.three")}</div>
                      <div>{t("format.simple.desc.four")}</div>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {t("format.legacy.heading")}
                    </p>
                    <div className="bg-gray-50 p-3 rounded text-xs font-mono overflow-x-auto">
                      <div>{t("format.legacy.desc.one")}</div>
                      <div>{t("format.legacy.desc.two")}</div>
                      <div>{t("format.legacy.desc.three")}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CSVUploadPage;
