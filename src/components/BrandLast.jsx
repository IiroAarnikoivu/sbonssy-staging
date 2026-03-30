import IconsLibrary from "@/util/IconsLibrary";
import { useTranslations } from "next-intl";
import React from "react";
const references = ["Ad", "Friend", "Facebook", "Instagram", "Influencer"];
const BrandLast = ({ formik, prev }) => {
  const t = useTranslations("onboardingBrand");
  const tt = useTranslations("References");
  const translatedReferences = references.map((ref) => ({
    value: ref,
    label: tt(ref) || ref,
  }));
  return (
    <div className="lg:mt-8 mt-6 formInputs">
      <div className="text-center mb-6 lg:mb-8 ">
        <h2 className="text-[24px] lg:text-[32px]">{t("step3.heading")}</h2>
        <p className="text-base leading-[150%] tracking-[0%]">
          {t("step3.para")}
        </p>
      </div>

      <div className="customSelectDesign relative">
        <label className="mb-2 block">{t("step3.label1")}</label>
        <div className="relative w-full">
          <select
            name="references"
            value={formik.values.references}
            onChange={formik.handleChange}
            className="w-full py-0"
          >
            <option value="">{t("step3.option")}</option>
            {translatedReferences.map((ref) => (
              <option key={ref.value} value={ref.value}>
                {ref.label}
              </option>
            ))}
          </select>
          <IconsLibrary
            styling="absolute top-1/2 z-1 -translate-1/2 right-6"
            name={"dropdownSelect"}
          />
        </div>
        {formik.touched.references && formik.errors.references && (
          <p className="text-red-500 text-sm mt-1">
            {formik.errors.references}
          </p>
        )}
      </div>
      <div className="flex justify-between items-center mt-4">
        <span>{t("step")} 3/3</span>

        <div className="flex gap-2 items-center">
          <button onClick={prev} className="btn secondaryBtn mr-4">
            {t("back")}
          </button>
          <button
            type="submit"
            disabled={formik.isSubmitting}
            className="primaryBtn"
          >
            {formik.isSubmitting ? t("step3.submitting") : t("step3.submit")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BrandLast;
