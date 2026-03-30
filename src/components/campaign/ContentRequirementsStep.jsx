"use client";

import { useTranslations } from "next-intl";

const ContentRequirementsStep = ({
  values,
  errors,
  touched,
  handleChange,
  handleBlur,
}) => {
  const t = useTranslations("Brand.campaignCreate.step4");
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

      <div className="mt-6 md:mt-[55px]">
        <label className="block mb-2 text-gray-700">{t("heading")} </label>
        <textarea
          name="creatorProfile.contentRequirements"
          value={values.creatorProfile.contentRequirements}
          onChange={handleChange}
          onBlur={handleBlur}
          className="forms w-full p-3 border rounded-lg focus:ring-gray-500 focus:border-gray-500 !h-auto "
          rows={8}
          placeholder={t("placeholder")}
        />
        {touched.creatorProfile?.contentRequirements &&
          errors.creatorProfile?.contentRequirements && (
            <p className="mt-1 text-sm text-red-600">
              {errors.creatorProfile.contentRequirements}
            </p>
          )}
      </div>
    </div>
  );
};

export default ContentRequirementsStep;
