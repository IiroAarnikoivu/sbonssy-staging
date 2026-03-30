"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useTranslations } from "next-intl";
import { isEUCountry } from "@/lib/vat/viesValidator";
import { validateVATNumberFormat } from "@/lib/vat/vatCalculator";
import api from "@/lib/axios";
import { useFormik } from "formik";
import * as Yup from "yup";
import Select from "react-select";
import DropdownIndicator from "@/components/DropdownIndicator";

const VATInformationForm = ({
  user,
  onUpdate,
  onValidationComplete,
  className = "",
  hideBusinessTypeQuestion = false,
}) => {
  const t = useTranslations("VAT");
  const initialValues = useMemo(() => {
    const country = user?.registrationCountry || "";
    const storedBt =
      user?.uiBusinessType ||
      user?.businessType ||
      user?.vatDetails?.uiBusinessType ||
      "individual";
    const vatStatus = (user?.vatStatus || "not_provided")
      .toString()
      .toLowerCase();
    const vatNumber = (user?.vatNumber || "").toString();
    const businessRegistrationNumber = (
      user?.businessRegistrationNumber ||
      user?.vatDetails?.businessRegistrationNumber ||
      ""
    ).toString();

    let uiBt = "individual";
    const isEU = country ? isEUCountry(country) : false;

    if (country === "FI") {
      // Finland: show vat option only when valid FI VAT
      if (
        storedBt === "vat_registered" ||
        storedBt === "business_no_vat" ||
        storedBt === "individual"
      ) {
        uiBt = storedBt;
      } else if (vatStatus === "valid" && vatNumber) {
        uiBt = "vat_registered";
      } else if (storedBt === "individual") {
        uiBt = "individual";
      } else {
        uiBt = "business_no_vat";
      }
    } else if (isEU) {
      // EU (non-FI): Show all options based on current status
      if (
        storedBt === "eu_vat_registered" ||
        storedBt === "business_no_vat" ||
        storedBt === "individual"
      ) {
        uiBt = storedBt;
      } else if (vatStatus === "valid" && vatNumber) {
        uiBt = "eu_vat_registered";
      } else if (storedBt === "individual") {
        uiBt = "individual";
      } else if (storedBt === "company" || storedBt === "business_no_vat") {
        uiBt = "business_no_vat";
      } else {
        uiBt = "individual";
      }
    } else {
      // Non-EU: prefer company_with_registration if number exists
      if (
        storedBt === "company_with_registration" ||
        storedBt === "company" ||
        storedBt === "individual"
      ) {
        uiBt = storedBt;
      } else if (businessRegistrationNumber) {
        uiBt = "company_with_registration";
      } else if (storedBt === "company_with_registration") {
        uiBt = "company_with_registration";
      } else if (storedBt === "company") {
        uiBt = "company";
      } else {
        uiBt = "individual";
      }
    }

    // For brand flows we do not ask the business type question; set sensible defaults based on country
    if (hideBusinessTypeQuestion) {
      if (!country) {
        uiBt = uiBt || "individual";
      } else if (country === "FI") {
        uiBt = "vat_registered";
      } else if (isEU) {
        uiBt = "eu_vat_registered";
      } else {
        uiBt = "company_with_registration";
      }
    }

    return {
      registrationCountry: country,
      businessType: uiBt,
      vatNumber: vatNumber,
      vatStatus,
      businessRegistrationNumber,
    };
  }, [user]);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [showVATInput, setShowVATInput] = useState(false);

  // Country options
  const countries = [
    { code: "AT", name: "Austria / Österreich" },
    { code: "BE", name: "Belgium / België" },
    { code: "BG", name: "Bulgaria / България" },
    { code: "HR", name: "Croatia / Hrvatska" },
    { code: "CY", name: "Cyprus / Κύπρος" },
    { code: "CZ", name: "Czech Republic / Česká republika" },
    { code: "DK", name: "Denmark / Danmark" },
    { code: "EE", name: "Estonia / Eesti" },
    { code: "FI", name: "Finland / Suomi" },
    { code: "FR", name: "France / France" },
    { code: "DE", name: "Germany / Deutschland" },
    { code: "GR", name: "Greece / Ελλάδα" },
    { code: "HU", name: "Hungary / Magyarország" },
    { code: "IE", name: "Ireland / Éire" },
    { code: "IT", name: "Italy / Italia" },
    { code: "LV", name: "Latvia / Latvija" },
    { code: "LT", name: "Lithuania / Lietuva" },
    { code: "LU", name: "Luxembourg / Lëtzebuerg" },
    { code: "MT", name: "Malta / Malta" },
    { code: "NL", name: "Netherlands / Nederland" },
    { code: "PL", name: "Poland / Polska" },
    { code: "PT", name: "Portugal / Portugal" },
    { code: "RO", name: "Romania / România" },
    { code: "SK", name: "Slovakia / Slovensko" },
    { code: "SI", name: "Slovenia / Slovenija" },
    { code: "ES", name: "Spain / España" },
    { code: "SE", name: "Sweden / Sverige" },
  ];
  const nonEuCountries = [
    { code: "AL", name: "Albania / Shqipëria" },
    { code: "AD", name: "Andorra / Andorra" },
    { code: "AM", name: "Armenia / Հայաստան" },
    { code: "AZ", name: "Azerbaijan / Azərbaycan" },
    { code: "BY", name: "Belarus / Беларусь" },
    { code: "BA", name: "Bosnia and Herzegovina / Bosna i Hercegovina" },
    { code: "GE", name: "Georgia / საქართველო" },
    { code: "IS", name: "Iceland / Ísland" },
    { code: "XK", name: "Kosovo / Kosovë" },
    { code: "LI", name: "Liechtenstein / Liechtenstein" },
    { code: "MD", name: "Moldova / Republica Moldova" },
    { code: "MC", name: "Monaco / Monaco" },
    { code: "ME", name: "Montenegro / Crna Gora" },
    { code: "MK", name: "North Macedonia / Северна Македонија" },
    { code: "NO", name: "Norway / Norge" },
    { code: "SM", name: "San Marino / San Marino" },
    { code: "RS", name: "Serbia / Србија" },
    { code: "CH", name: "Switzerland / Schweiz" },
    { code: "UA", name: "Ukraine / Україна" },
    { code: "GB", name: "United Kingdom / United Kingdom" },
    { code: "VA", name: "Vatican City / Città del Vaticano" },
  ];

  // Keep showVATInput in sync based on values
  const computeShowVAT = useCallback(
    (vals) => {
      if (!vals?.registrationCountry) return false;
      if (hideBusinessTypeQuestion) {
        // Brand flow: always show VAT input for EU (including FI)
        return (
          vals.registrationCountry === "FI" ||
          isEUCountry(vals.registrationCountry)
        );
      }
      if (vals.registrationCountry === "FI") {
        return vals.businessType === "vat_registered";
      }
      if (isEUCountry(vals.registrationCountry)) {
        // Show VAT input for EU VAT registered companies
        return vals.businessType === "eu_vat_registered";
      }
      // Non-EU: do not show VAT field in this form
      return false;
    },
    [hideBusinessTypeQuestion],
  );

  // Check if business registration number should be shown for non-EU countries
  const showBusinessRegistration = useCallback(
    (vals) => {
      if (!vals?.registrationCountry) return false;
      if (isEUCountry(vals.registrationCountry)) return false;
      if (hideBusinessTypeQuestion) return true; // Brand flow: non-EU must provide business ID
      return vals.businessType === "company_with_registration";
    },
    [hideBusinessTypeQuestion],
  );

  // Validation schema (must be created before useFormik initialization)
  const validationSchema = useMemo(
    () =>
      Yup.object().shape({
        registrationCountry: Yup.string().required(),
        businessType: Yup.string()
          .oneOf([
            "vat_registered",
            "eu_vat_registered",
            "business_no_vat",
            "individual",
            "company",
            "company_with_registration",
          ])
          .required(),
        businessRegistrationNumber: Yup.string().when(
          ["registrationCountry", "businessType"],
          {
            is: (registrationCountry, businessType) => {
              return (
                !isEUCountry(registrationCountry) &&
                businessType === "company_with_registration"
              );
            },
            then: (schema) =>
              schema
                .required(t("nonEu.registrationNumberRequired"))
                .min(3, t("nonEu.registrationNumberTooShort")),
            otherwise: (schema) => schema.notRequired(),
          },
        ),
        vatNumber: Yup.string().when(["registrationCountry", "businessType"], {
          is: (registrationCountry, businessType) => {
            const vals = { registrationCountry, businessType };
            return computeShowVAT(vals);
          },
          then: (schema) =>
            schema
              .min(4, t("vies.invalidFormat"))
              .required(t("validationMessages.vatRequired")),
          otherwise: (schema) => schema.notRequired(),
        }),
        vatStatus: Yup.string().required(),
      }),
    [computeShowVAT, t],
  );

  // Formik setup using hook (enableReinitialize to update when user/initialValues change)
  const formik = useFormik({
    enableReinitialize: true,
    initialValues,
    validationSchema,
    onSubmit: async (values, helpers) => {
      const updateData = {
        registrationCountry: values.registrationCountry,
        businessType: values.businessType,
        vatNumber: values.vatNumber || null,
        vatStatus: values.vatStatus,
        lastVatCheckedAt: values.vatNumber ? new Date() : null,
        businessRegistrationNumber: values.businessRegistrationNumber || null,
      };

      if (onUpdate) {
        await onUpdate(updateData);
      }

      if (onValidationComplete) {
        onValidationComplete(values);
      }

      helpers.setSubmitting(false);
    },
  });

  useEffect(() => {
    setShowVATInput(computeShowVAT(formik.values));
  }, [formik.values, computeShowVAT]);

  const lastValuesHashRef = useRef("");
  useEffect(() => {
    const hash = JSON.stringify(formik.values);
    if (hash !== lastValuesHashRef.current) {
      lastValuesHashRef.current = hash;
      if (onValidationComplete) {
        onValidationComplete(formik.values);
      }
    }
  }, [formik.values, onValidationComplete]);

  const handleBusinessTypeToggle = (type, values, setFieldValue) => {
    setFieldValue("businessType", type);
    const next = { ...values, businessType: type };
    const show = computeShowVAT(next);
    setShowVATInput(show);

    // Reset VAT number and status when changing business type
    if (type !== "eu_vat_registered" && type !== "vat_registered") {
      setFieldValue("vatNumber", "");
      setFieldValue("vatStatus", "not_provided");
      setValidationResult(null);
    }

    // Reset business registration number when changing from company_with_registration
    if (type !== "company_with_registration") {
      setFieldValue("businessRegistrationNumber", "");
    }

    // Set default VAT status for EU VAT registered companies
    if (type === "eu_vat_registered") {
      setFieldValue("vatStatus", "pending");
    }
  };

  const handleVATValidation = async (vatNumber, values, setFieldValue) => {
    if (!vatNumber || vatNumber.length < 4) {
      setValidationResult(null);
      return;
    }

    setIsValidating(true);

    try {
      const isEU = isEUCountry(values.registrationCountry);
      let candidate = vatNumber.trim().toUpperCase();
      // Auto-prefix EU VAT numbers with country code if missing
      if (isEU && !candidate.startsWith(values.registrationCountry)) {
        candidate = `${values.registrationCountry}${candidate}`;
      }

      const formatValidation = validateVATNumberFormat(
        candidate,
        values.registrationCountry,
      );

      if (isEU) {
        // For EU: do not block on local format alone; always try VIES
        try {
          const response = await api.post("/vat/validate", {
            vatNumber: candidate,
            countryCode: values.registrationCountry,
          });
          const result = response?.data?.validation || response.validation;
          setValidationResult(result);
          const viesVerified =
            result?.validatedBy && result.validatedBy.startsWith("vies");
          setFieldValue(
            "vatStatus",
            result.isValid ? (viesVerified ? "verified" : "valid") : "invalid",
          );
          setFieldValue("vatNumber", result.vatNumber || candidate);
        } catch (viesErr) {
          console.error(
            "VIES validation failed, falling back to format check:",
            viesErr,
          );
          setValidationResult({
            isValid: !!formatValidation.isValid,
            warning: "VIES service unavailable - format validation used",
            warningKey: "VAT.vies.fallbackWarning",
            error: !formatValidation.isValid
              ? formatValidation.error || "Invalid VAT number format"
              : undefined,
            errorKey: !formatValidation.isValid
              ? formatValidation.errorKey || "VAT.vies.invalidFormat"
              : undefined,
          });
          setFieldValue(
            "vatStatus",
            formatValidation.isValid ? "pending" : "invalid",
          );
          setFieldValue(
            "vatNumber",
            formatValidation.isValid
              ? formatValidation.cleanVatNumber
              : candidate,
          );
        }
      } else {
        // Non-EU: rely on format only
        if (!formatValidation.isValid) {
          setValidationResult({
            isValid: false,
            error: formatValidation.error,
            errorKey: formatValidation.errorKey || undefined,
          });
          setFieldValue("vatStatus", "invalid");
        } else {
          setValidationResult({
            isValid: true,
            country: values.registrationCountry,
            vatNumber: formatValidation.cleanVatNumber,
          });
          setFieldValue("vatStatus", "valid");
          setFieldValue("vatNumber", formatValidation.cleanVatNumber);
        }
      }
    } catch (error) {
      console.error("VAT validation error:", error);
      setValidationResult({
        isValid: false,
        error:
          error?.error || error?.message || "Validation service unavailable",
        warning:
          "Using format validation only - VIES service may be temporarily unavailable",
        warningKey: "VAT.vies.fallbackWarning",
      });
      setFieldValue("vatStatus", "pending");
      setFieldValue("vatNumber", vatNumber.toUpperCase());
    } finally {
      setIsValidating(false);
    }
  };

  // onSubmit now handled inside useFormik config above

  // Render country-specific questions
  const renderCountryQuestions = (values, setFieldValue) => {
    if (hideBusinessTypeQuestion) return null;
    if (!values.registrationCountry) return null;

    if (values.registrationCountry === "FI") {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("finland.question")}
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="businessType"
                  value="vat_registered"
                  checked={
                    values.businessType === "vat_registered" ||
                    values.businessType === "company"
                  }
                  onChange={() =>
                    handleBusinessTypeToggle(
                      "vat_registered",
                      values,
                      setFieldValue,
                    )
                  }
                  className="mr-2"
                />
                <span className="text-sm">{t("finland.vatRegistered")}</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="businessType"
                  value="business_no_vat"
                  checked={values.businessType === "business_no_vat"}
                  onChange={() =>
                    handleBusinessTypeToggle(
                      "business_no_vat",
                      values,
                      setFieldValue,
                    )
                  }
                  className="mr-2"
                />
                <span className="text-sm">{t("finland.businessNoVat")}</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="businessType"
                  value="individual"
                  checked={values.businessType === "individual"}
                  onChange={() =>
                    handleBusinessTypeToggle(
                      "individual",
                      values,
                      setFieldValue,
                    )
                  }
                  className="mr-2"
                />
                <span className="text-sm">{t("individual")}</span>
              </label>
            </div>
          </div>
        </div>
      );
    }

    // For non-FI EU countries
    if (isEUCountry(values.registrationCountry)) {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t(
                "euVatQuestion",
                "Is your company registered for VAT in your own country?",
              )}
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="businessType"
                  value="eu_vat_registered"
                  checked={
                    values.businessType === "eu_vat_registered" ||
                    values.businessType === "company"
                  }
                  onChange={() =>
                    handleBusinessTypeToggle(
                      "eu_vat_registered",
                      values,
                      setFieldValue,
                    )
                  }
                  className="mr-2"
                />
                <span className="text-sm">
                  {t(
                    "euVatRegistered",
                    "Yes, my company has a valid EU VAT number",
                  )}
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="businessType"
                  value="business_no_vat"
                  checked={values.businessType === "business_no_vat"}
                  onChange={() =>
                    handleBusinessTypeToggle(
                      "business_no_vat",
                      values,
                      setFieldValue,
                    )
                  }
                  className="mr-2"
                />
                <span className="text-sm">
                  {t(
                    "businessNoVAT",
                    "No, my company does not have a VAT number",
                  )}
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="businessType"
                  value="individual"
                  checked={values.businessType === "individual"}
                  onChange={() =>
                    handleBusinessTypeToggle(
                      "individual",
                      values,
                      setFieldValue,
                    )
                  }
                  className="mr-2"
                />
                <span className="text-sm">
                  {t(
                    "individual",
                    "I am a private individual (no registered business)",
                  )}
                </span>
              </label>
            </div>
          </div>
        </div>
      );
    }

    // For non-EU countries
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("nonEu.businessTypeQuestion")}
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="businessType"
                value="company_with_registration"
                checked={
                  values.businessType === "company_with_registration" ||
                  (values.businessType === "company" &&
                    values.businessRegistrationNumber)
                }
                onChange={() =>
                  handleBusinessTypeToggle(
                    "company_with_registration",
                    values,
                    setFieldValue,
                  )
                }
                className="mr-2"
              />
              <span className="text-sm">
                {t("nonEu.hasRegistrationNumber")}
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="businessType"
                value="company"
                checked={
                  values.businessType === "company" &&
                  !values.businessRegistrationNumber &&
                  values.businessType !== "company_with_registration"
                }
                onChange={() =>
                  handleBusinessTypeToggle("company", values, setFieldValue)
                }
                className="mr-2"
              />
              <span className="text-sm">{t("nonEu.noRegistrationNumber")}</span>
            </label>
            {/* <label className="flex items-center">
              <input
                type="radio"
                name="businessType"
                value="individual"
                checked={values.businessType === "individual"}
                onChange={() =>
                  handleBusinessTypeToggle("individual", values, setFieldValue)
                }
                className="mr-2"
              />
              <span className="text-sm">{t("nonEu.privateIndividual")}</span>
            </label> */}
          </div>
        </div>
      </div>
    );
  };

  // EU countries: show appropriate options
  return (
    <div className={`bg-white p-6 rounded-lg shadow-sm border ${className}`}>
      <h3 className="text-lg font-semibold mb-4">{t("title")}</h3>
      <form onSubmit={formik.handleSubmit} className="space-y-6">
        {/* Country Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("countryLabel")}
          </label>
          {(() => {
            const euOptions = countries.map((c) => ({
              value: c.code,
              label: c.name,
            }));
            const nonEuOptions = nonEuCountries.map((c) => ({
              value: c.code,
              label: c.name,
            }));
            const groupedOptions = [
              { label: t("euCountries"), options: euOptions },
              { label: t("nonEuCountries"), options: nonEuOptions },
            ];
            const current =
              [...euOptions, ...nonEuOptions].find(
                (o) => o.value === formik.values.registrationCountry,
              ) || null;
            return (
              <Select
                key={`country-${formik.values.registrationCountry || "none"}`}
                inputId="registrationCountry"
                instanceId="registrationCountry"
                options={groupedOptions}
                value={current}
                placeholder={t("selectCountry")}
                classNamePrefix="rs"
                components={{ DropdownIndicator }}
                isSearchable
                onChange={(opt) => {
                  const v = opt?.value || "";
                  formik.setFieldValue("registrationCountry", v);
                  if (hideBusinessTypeQuestion) {
                    const nextBt =
                      v === "FI"
                        ? "vat_registered"
                        : isEUCountry(v)
                          ? "eu_vat_registered"
                          : "company_with_registration";
                    formik.setFieldValue("businessType", nextBt);
                  } else {
                    if (
                      v === "FI" &&
                      formik.values.businessType === "company"
                    ) {
                      formik.setFieldValue("businessType", "vat_registered");
                    }
                    if (
                      v !== "FI" &&
                      isEUCountry(v) &&
                      formik.values.businessType === "vat_registered"
                    ) {
                      formik.setFieldValue("businessType", "business_no_vat");
                    }
                  }
                  formik.setFieldValue("vatNumber", "");
                  formik.setFieldValue("vatStatus", "not_provided");
                  // Clear business registration number on country change
                  formik.setFieldValue("businessRegistrationNumber", "");
                  setShowVATInput(
                    computeShowVAT({
                      ...formik.values,
                      registrationCountry: v,
                    }),
                  );
                }}
              />
            );
          })()}
        </div>

        {/* Country-specific questions */}
        {renderCountryQuestions(formik.values, formik.setFieldValue)}

        {/* Business Registration Number Input (Non-EU) */}
        {showBusinessRegistration(formik.values) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("nonEu.registrationNumberLabel")}
            </label>
            <div className="relative">
              <input
                type="text"
                name="businessRegistrationNumber"
                value={formik.values.businessRegistrationNumber || ""}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder={t("nonEu.registrationNumberPlaceholder")}
                required={showBusinessRegistration(formik.values)}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:bg-[#0c0d060d] focus:ring-blue-500 focus:border-blue-500 ${
                  formik.touched.businessRegistrationNumber &&
                  formik.errors.businessRegistrationNumber
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
              />
            </div>
            {formik.touched.businessRegistrationNumber &&
              formik.errors.businessRegistrationNumber && (
                <p className="mt-2 text-sm text-red-600">
                  {formik.errors.businessRegistrationNumber}
                </p>
              )}
          </div>
        )}

        {/* VAT Number Input */}
        {computeShowVAT(formik.values) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {formik.values.registrationCountry === "FI"
                ? t("finland.vatNumberLabel")
                : isEUCountry(formik.values.registrationCountry)
                  ? t("eu.vatNumberLabel")
                  : t("nonEu.businessNumberLabel")}
            </label>
            <div className="relative">
              <input
                type="text"
                name="vatNumber"
                value={formik.values.vatNumber}
                onChange={(e) => {
                  const value = e.target.value;
                  formik.setFieldValue("vatNumber", value);
                  if (value.length >= 4) {
                    handleVATValidation(
                      value,
                      formik.values,
                      formik.setFieldValue,
                    );
                  }
                }}
                placeholder={
                  formik.values.registrationCountry === "FI"
                    ? "FI12345678"
                    : "SE123456789012"
                }
                required={computeShowVAT(formik.values)}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:bg-[#0c0d060d] focus:ring-blue-500 focus:border-blue-500 ${
                  formik.touched.vatNumber && formik.errors.vatNumber
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
              />
              {isValidating && (
                <div className="absolute right-3 top-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                </div>
              )}
            </div>

            {formik.touched.vatNumber && formik.errors.vatNumber && (
              <p className="mt-2 text-sm text-red-600">
                {formik.errors.vatNumber}
              </p>
            )}

            {/* Validation Result */}
            {validationResult && (
              <div
                className={`mt-2 p-2 rounded text-sm ${
                  validationResult.isValid
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : validationResult.warning
                      ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {validationResult.isValid ? (
                  <div>
                    ✓ {t("numbervalidation")}
                    {validationResult.validatedBy === "format_check" && (
                      <div className="text-xs mt-1 text-yellow-600">
                        ⚠️ {t("format")}
                      </div>
                    )}
                    {validationResult.name && (
                      <div className="text-xs mt-1">
                        Company: {validationResult.name}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {(() => {
                      const key = validationResult.errorKey;
                      const err = key
                        ? t(key.replace(/^VAT\./, ""))
                        : validationResult.error;
                      return <>✗ {err}</>;
                    })()}
                    {validationResult.warning && (
                      <div className="text-xs mt-1 text-yellow-600">
                        {(() => {
                          const wkey = validationResult.warningKey;
                          const w = wkey
                            ? t(wkey.replace(/^VAT\./, ""))
                            : validationResult.warning;
                          return <>ℹ️ {w}</>;
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Information Note */}
        <div className="bg-[#F3F3F2] p-4 rounded-lg border border-[#F3F3F2]">
          <p className="text-sm ">{t("infoNote")}</p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={
            isValidating ||
            formik.isSubmitting ||
            formik.values.vatStatus === "invalid"
          }
          onClick={() =>
            formik.setTouched({
              registrationCountry: true,
              businessType: true,
              vatNumber: true,
              vatStatus: true,
            })
          }
          className="w-full bg-[#f26915] text-white py-3 px-4 rounded-2xl hover:bg-[#f26915] focus:ring-2 focus:ring-[#f26915] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isValidating ? t("validating") : t("saveInformation")}
        </button>
      </form>
    </div>
  );
};

export default VATInformationForm;
