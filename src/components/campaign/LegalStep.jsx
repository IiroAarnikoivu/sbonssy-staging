import { useTranslations } from "next-intl";

const LegalStep = ({ values, errors, touched, handleChange, handleBlur, setFieldValue }) => {
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault(); // Prevent form submission on Enter
    }
  };
  const t = useTranslations("Brand.campaignCreate.step6");

  const sampleTermsTemplate = `These Terms & Conditions apply to affiliates participating in the [Brand Name] Campaign through sbonssy. By promoting this campaign, you agree to the rules below.

1. Allowed & Prohibited Content
Your promotional content must not:
-    Violate any laws or regulations
-    Include harmful, misleading, offensive, or explicit material
-    Infringe on intellectual property or brand rights
-    Use deceptive or unethical methods (e.g., cookie stuffing, forced clicks, traffic hijacking)

2. Use of Affiliate Links
Affiliates must:
-    Use only the tracking links and creatives provided on the platform
-    Not alter tracking parameters or hide the true source of clicks
-    Not imitate or replicate the brand's website, branding, or official channels
-    Not use redirects designed to mask traffic origins

3. Payments & Validation
-    Transactions follow the platform's validation/lock period 30 days
-    Commissions may be reversed for returns, cancellations, fraud, invalid traffic, or any breach of these terms

4. PPC Advertising (If applicable)
Unless explicitly permitted in the campaign:
-    Do not bid on the brand name, trademarks, or misspellings
-    Do not use the brand name in ad copy or display URLs
-    Do not direct link from PPC ads to the brand's website

5. Social Media Rules
Allowed:
-    Sharing affiliate links on your own social profiles with proper disclosure
Not allowed:
-    Posting on official brand pages
-    Using the brand's name or trademarks in usernames or page names
-    Running social paid ads containing the brand name unless approved

6. Sub-Affiliates
If you work with sub-affiliates, you are responsible for ensuring they comply with all terms. Non-compliant traffic may be reversed or removed.

7. Disclosure Requirements
Affiliates must clearly disclose their commercial relationship with the brand, in compliance with applicable laws (FTC, CMA, ASIC, GDPR, etc.).

8. Termination
The brand may pause or end the campaign at any time. Affiliates who breach these terms may be removed and may have related commissions reversed.`;

  const handleUseSampleTemplate = () => {
    setFieldValue("legal.customTerms", sampleTermsTemplate);
  };
  return (
    <div className="space-y-4">
      <div className="text-center mb-6 lg:mb-8">
        <h2 className="text-[24px] lg:text-[32px]">{t("heading")}</h2>
        <p className="text-base leading-[150%] tracking-[0%]">
          {t("subHeading")}
        </p>
      </div>
      {/* <h2 className="text-xl font-semibold text-gray-800 mb-4">
        {t("heading")}
      </h2> */}
      {/* 
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              type="checkbox"
              name="legal.termsAgreed"
              checked={values.legal.termsAgreed}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown} // Add keydown handler
              className="h-4 w-4 text-[#f26915] rounded"
              required
            />
          </div>
          <div className="ml-3 text-sm">
            <label className="font-medium text-gray-700">
              {t("txt1")}{" "}
              <a
                href="/terms"
                className="text-[#f26915] hover:underline"
                target="_blank"
              >
                {t("txt2")}
              </a>
            </label>
            {touched.legal?.termsAgreed && errors.legal?.termsAgreed && (
              <p className="mt-1 text-red-600">{errors.legal.termsAgreed}</p>
            )}
          </div>
        </div>
      </div> */}

      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex items-start gap-2">
          <label className="checkbox-wrapper flex items-center">
            <input
              type="checkbox"
              id="legal_ftcDisclosure"
              name="legal.ftcDisclosure"
              checked={values.legal.ftcDisclosure}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
            />
            <span className="custom-checkbox"></span>
          </label>
          <div className="text-sm">
            <label
              htmlFor="legal_ftcDisclosure"
              className="font-medium text-gray-700"
            >
              {t("label")}
            </label>
            <p className="mt-1 text-gray-500">{t("para")}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 md:mt-[55px]">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-gray-700">{t("head")}</label>
          <button
            type="button"
            onClick={handleUseSampleTemplate}
            className="text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            {t("useSampleTemplate")}
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-3">{t("templateHelper")}</p>
        <textarea
          name="legal.customTerms"
          value={values.legal.customTerms}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="forms w-full p-3 border rounded-lg focus:ring-gray-500 focus:border-gray-500 !h-auto"
          rows={8}
          placeholder={t("placeholder")}
        />
        {touched.legal?.customTerms && errors.legal?.customTerms && (
          <p className="mt-1 text-sm text-red-600">
            {errors.legal.customTerms}
          </p>
        )}
      </div>
    </div>
  );
};

export default LegalStep;
