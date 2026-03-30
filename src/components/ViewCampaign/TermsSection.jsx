"use client";
import React from "react";

/**
 * Terms section rendering per role and acceptance state.
 * @param {Object} props
 * @param {string} [props.role=""]
 * @param {boolean} [props.termsAccepted=false]
 * @param {string} [props.campaignType=""]
 * @param {string} [props.customTerms=""]
 * @param {boolean} [props.termsAgreed=false]
 * @param {(v: boolean) => void} [props.setTermsAgreed=() => {}]
 * @param {boolean} [props.ftcDisclosure=false]
 * @param {(v: boolean) => void} [props.setFtcDisclosure=() => {}]
 * @param {(key: string) => string} props.t
 */
const TermsSection = ({
  role = "",
  termsAccepted = false,
  campaignType = "",
  customTerms = "",
  termsAgreed = false,
  setTermsAgreed = () => {},
  ftcDisclosure = false,
  setFtcDisclosure = () => {},
  t,
}) => {
  if (role === "brand") {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-bold">{t("terms")}</h3>
        <p className="text-sm whitespace-pre-wrap">{customTerms}</p>
      </div>
    );
  }

  if (role === "sports-ambassador" && !termsAccepted && campaignType !== "private") {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-bold">{t("terms")}</h3>
        <p className="text-sm whitespace-pre-wrap">{customTerms}</p>
        <div className="flex items-start gap-2">
          <label className="checkbox-wrapper flex items-center">
            <input
              type="checkbox"
              id="vc_termsAgreed"
              checked={termsAccepted ? true : termsAgreed}
              onChange={(e) => !termsAccepted && setTermsAgreed?.(e.target.checked)}
              className="mt-1"
              readOnly={termsAccepted}
            />
            <span className="custom-checkbox"></span>
          </label>
          <label htmlFor="vc_termsAgreed">{t("para")}</label>
        </div>
        <div className="flex items-start gap-2">
          <label className="checkbox-wrapper flex items-center">
            <input
              type="checkbox"
              id="vc_ftcDisclosure"
              checked={termsAccepted ? true : ftcDisclosure}
              onChange={(e) => !termsAccepted && setFtcDisclosure?.(e.target.checked)}
              className="mt-1"
              readOnly={termsAccepted}
            />
            <span className="custom-checkbox"></span>
          </label>
          <label htmlFor="vc_ftcDisclosure">{t("para2")}</label>
        </div>
      </div>
    );
  }

  return null;
};

export default TermsSection;
