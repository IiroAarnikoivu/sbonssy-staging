"use client";

import { useTranslations } from "next-intl";
import React, { useState, useRef } from "react";
import { FiUpload, FiFile, FiCheck, FiX, FiAlertCircle } from "react-icons/fi";

const CSVUpload = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile);
      setResults(null);
    } else {
      alert("Please select a valid CSV file");
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === "text/csv") {
      setFile(droppedFile);
      setResults(null);
    } else {
      alert("Please drop a valid CSV file");
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append("csvFile", file);

      const response = await fetch("/api/admin/upload-csv", {
        method: "POST",
        body: formData,
      });

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await response.text();
        console.error("Non-JSON response received:", textResponse);
        throw new Error(
          `Server returned HTML instead of JSON. Status: ${response.status}`
        );
      }

      const data = await response.json();

      if (data.success) {
        setResults(data.results);
        setProgress(100);
      } else {
        throw new Error(data.error || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      setResults({
        total: 0,
        successful: 0,
        failed: 1,
        errors: [
          {
            row: "N/A",
            email: "N/A",
            error: error.message,
          },
        ],
      });
    } finally {
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setResults(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const downloadErrorReport = () => {
    if (!results || !results.errors.length) return;

    const csvContent = [
      ["Row", "Email", "Error"],
      ...results.errors.map((error) => [
        error.row || "N/A",
        error.email || "N/A",
        error.error || "Unknown error",
      ]),
    ]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "csv-upload-errors.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };
  const t = useTranslations("csv");
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          {t("heading")}
        </h2>

        {/* Upload Area */}
        {!results && (
          <div className="mb-8">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                file
                  ? "border-green-400 bg-green-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              {file ? (
                <div className="flex items-center justify-center space-x-3">
                  <FiFile className="text-green-500 text-2xl" />
                  <div>
                    <p className="text-green-700 font-medium">{file.name}</p>
                    <p className="text-green-600 text-sm">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <FiUpload className="mx-auto text-gray-400 text-4xl mb-4" />
                  <p className="text-gray-600 mb-2">{t("dropHeading")}</p>
                  <p className="text-gray-500 text-sm">{t("support")}</p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {t("file")}
              </button>
            </div>

            {/* CSV Format Info */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">
                {t("formatHeading")}
              </h3>
              <div className="text-blue-800 text-sm space-y-2">
                <div>
                  <p className="font-medium">{t("uploadation.heading")}</p>
                  <p>
                    • <strong>{t("uploadation.role.one.label")}</strong>{" "}
                    {t("uploadation.role.one.head")}
                  </p>
                  <p>
                    • <strong>{t("uploadation.role.two.label")}</strong>{" "}
                    {t("uploadation.role.two.head")}
                  </p>
                </div>
                <div>
                  <p className="font-medium">{t("uploadation.heading")}</p>
                  <p>
                    • <strong>{t("uploadation.steps.one.label")}</strong>{" "}
                    {t("uploadation.steps.one.head")}
                  </p>
                  <p>
                    • <strong>{t("uploadation.steps.two.label")}</strong>{" "}
                    {t("uploadation.steps.two.head")}
                  </p>
                  <p>• {t("uploadation.steps.three")}</p>
                </div>
                <p className="text-blue-600 italic">{t("uploadation.para")}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4 mt-6">
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className={`px-6 py-3 rounded-md font-medium transition-colors ${
                  !file || uploading
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-green-600 text-white hover:bg-green-700"
                }`}
              >
                {uploading ? t("buttons.one") : t("buttons.two")}
              </button>

              {file && (
                <button
                  onClick={resetUpload}
                  disabled={uploading}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  {t("buttons.three")}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {uploading && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>{t("processing")}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">
              {t("results")}
            </h3>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <FiFile className="text-blue-600 text-xl mr-3" />
                  <div>
                    <p className="text-blue-900 font-semibold">
                      {results.total}
                    </p>
                    <p className="text-blue-700 text-sm">{t("records")}</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <FiCheck className="text-green-600 text-xl mr-3" />
                  <div>
                    <p className="text-green-900 font-semibold">
                      {results.successful}
                    </p>
                    <p className="text-green-700 text-sm">{t("success")}</p>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <FiX className="text-red-600 text-xl mr-3" />
                  <div>
                    <p className="text-red-900 font-semibold">
                      {results.failed}
                    </p>
                    <p className="text-red-700 text-sm">{t("failed")}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Details */}
            {results.errors && results.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <FiAlertCircle className="text-red-600 text-xl mr-2" />
                    <h4 className="text-red-900 font-medium">
                      {t(errors)} ({results.errors.length})
                    </h4>
                  </div>
                  <button
                    onClick={downloadErrorReport}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                  >
                    {t("errorReport")}
                  </button>
                </div>

                <div className="max-h-64 overflow-y-auto">
                  <div className="space-y-2">
                    {results.errors.slice(0, 10).map((error, index) => (
                      <div
                        key={index}
                        className="text-red-800 text-sm p-2 bg-red-100 rounded"
                      >
                        <strong>
                          {t("row")} {error.row}:
                        </strong>{" "}
                        {error.email} - {error.error}
                      </div>
                    ))}
                    {results.errors.length > 10 && (
                      <p className="text-red-700 text-sm italic">
                        ... {t("and")} {results.errors.length - 10} {t("more")}
                        {t("report")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Success Message */}
            {results.successful > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <FiCheck className="text-green-600 text-xl mr-2" />
                  <div>
                    <h4 className="text-green-900 font-medium">
                      {t("successMsg.msg")}
                    </h4>
                    <p className="text-green-800 text-sm">
                      {results.successful} {t("successMsg.para")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Reset Button */}
            <div className="flex justify-center">
              <button
                onClick={resetUpload}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {t("buttons.reset")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CSVUpload;
