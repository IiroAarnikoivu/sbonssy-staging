"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import axios from "axios";

import { useTranslations } from "next-intl";
import DropdownIndicator from "./DropdownIndicator";
import useTranslatedInterests from "@/hook/useInterestTranslations";
const Select = dynamic(() => import("react-select"), { ssr: false });

// const interests = [
//   "Fitness",
//   "Music",
//   "Travel",
//   "Technology",
//   "Photography",
//   "Fashion",
//   "Gaming",
//   "Cooking",
//   "Art",
//   "Reading",
// ];

// const interestOptions = interests.map((interest) => ({
//   label: interest,
//   value: interest,
// }));

const Details = ({ formik, next, prev }) => {
  const t = useTranslations("onboardingSport");
  const interestOptions = useTranslatedInterests();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="lg:mt-8 mt-6 formInputs">
      <div className="text-center mb-6 lg:mb-8 ">
        <h2 className="text-[24px] lg:text-[32px]">{t("step2.heading")} </h2>
        <p className="text-base leading-[150%] tracking-[0%]">
          {t("step2.para")}
        </p>
      </div>
      <div>
        <label className="block mb-2 mt-6 ">{t("step2.label1")}</label>
        <textarea
          name="biography"
          value={formik.values?.biography}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          className="w-full border p-2 rounded"
        />
        <div className="flex justify-between items-center mt-1">
          <div>
            {formik.touched.biography && formik.errors.biography && (
              <p className="text-red-500 text-sm">{formik.errors.biography}</p>
            )}
          </div>
          <p className="text-gray-500 text-sm">
            {formik.values?.biography?.length || 0}/500
          </p>
        </div>
      </div>

      {/* <div>
        <label className="block mb-2 mt-6">{t("step2.label2")}</label>
        <textarea
          name="achievements"
          value={formik.values?.achievements}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          className="w-full border p-2 rounded"
        />
        <div className="flex justify-between items-center mt-1">
          <div>
            {formik.touched.achievements && formik.errors.achievements && (
              <p className="text-red-500 text-sm">
                {formik.errors.achievements}
              </p>
            )}
          </div>
          <p className="text-gray-500 text-sm">
            {formik.values?.achievements?.length || 0}/500
          </p>
        </div>
      </div> */}
      {/* 
      <div>
        <label className="block mb-2 mt-6">{t("step2.label3")}</label>
        <textarea
          name="records"
          value={formik.values?.records}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          className="w-full border p-2 rounded"
        />
        <div className="flex justify-between items-center mt-1">
          <div>
            {formik.touched.records && formik.errors.records && (
              <p className="text-red-500 text-sm">{formik.errors.records}</p>
            )}
          </div>
          <p className="text-gray-500 text-sm">
            {formik.values?.records?.length || 0}/500
          </p>
        </div>
      </div> */}
      {/* 
      <div>
        <label className="block mb-2 mt-6">{t("step2.label4")}</label>
        <textarea
          name="goals"
          value={formik.values?.goals}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          className="w-full border p-2 rounded"
        />
        <div className="flex justify-between items-center mt-1">
          <div>
            {formik.touched.goals && formik.errors.goals && (
              <p className="text-red-500 text-sm">{formik.errors.goals}</p>
            )}
          </div>
          <p className="text-gray-500 text-sm">
            {formik.values?.goals?.length || 0}/500
          </p>
        </div>
      </div> */}
      <div
        className={`customSelectDesign relative ${
          isOpen === true ? "mb-40" : null
        }`}
      >
        <label className="block mb-2 mt-6"> {t("step2.label5")} </label>
        <Select
          isMulti
          name="interests"
          options={interestOptions}
          placeholder={t("step2.placeholder")}
          closeMenuOnSelect={false}
          value={interestOptions
            .flatMap((group) => group.options)
            .filter((opt) => formik.values.interests.includes(opt.value))}
          onChange={(selected) => {
            const values = selected.map((item) => item.value);
            formik.setFieldValue("interests", values);
          }}
          onMenuOpen={() => setIsOpen(true)}
          onMenuClose={() => setIsOpen(false)}
          styles={{
            indicatorSeparator: () => ({
              display: "none", // Removes the separator
            }),
          }}
          components={{ DropdownIndicator }}
        />
        {formik.touched.interests && formik.errors.interests && (
          <p className="text-red-500 text-sm mt-1">{formik.errors.interests}</p>
        )}
      </div>

      <div className="flex justify-between items-center mt-4">
        <div className="">{t("step")} 2/4</div>
        <div>
          <button onClick={prev} className="btn secondaryBtn mr-4">
            {t("back")}
          </button>

          <button onClick={next} className="primaryBtn">
            {t("next")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Details;
