"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import {
  checkOptions,
  companyInterest,
  uploadToCloudinary,
} from "@/lib/helper";
import { IoMdClose } from "react-icons/io";
import { useTranslations } from "next-intl";
import CropperComponent from "./Cropper";
import DropdownIndicator from "./DropdownIndicator";
const Select = dynamic(() => import("react-select"), { ssr: false });

const BrandDetails = ({
  formik,
  handleCompanyLogo,
  handleRemoveCompanyLogo,
  next,
  prev,
}) => {
  const t = useTranslations("onboardingBrand");
  const tt = useTranslations("CompanyInterests");
  const [croppingImage, setCroppingImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const companyInterestOptions = companyInterest.map((interest) => ({
    label: tt(interest) || interest,
    value: interest,
  }));
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      formik.setFieldError("companyLogo", t("step2.invalidImage"));
      return;
    }

    // Validate file size (e.g., max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      formik.setFieldError("companyLogo", t("step2.fileTooLarge"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCroppingImage(reader.result);
    };
    reader.onerror = () => {
      formik.setFieldError("companyLogo", t("step2.readError"));
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedFile) => {
    if (!croppedFile) {
      setCroppingImage(null);
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const uploadedUrl = await uploadToCloudinary({
        file: croppedFile,
        folder: "brand_logo",
      });
      if (uploadedUrl?.url) {
        formik.setFieldValue("companyLogo", uploadedUrl.url);
      } else {
        throw new Error("No URL returned from Cloudinary");
      }
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadError(t("step2.uploadError"));
      formik.setFieldError("companyLogo", t("step2.uploadError"));
    } finally {
      setIsUploading(false);
      setCroppingImage(null);
    }
  };

  const handleCancelCrop = () => {
    setCroppingImage(null);
    setUploadError(null);
  };
  //  const handleCompanyLogo = (e) => {
  //     const file = e.target.files?.[0];
  //     if (file) {
  //       uploadToCloudinary({ file, folder: "brand_logo" }).then((uploadedUrl) => {
  //         if (uploadedUrl?.url) {
  //           formikBrand.setFieldValue("companyLogo", uploadedUrl.url);
  //         }
  //       });
  //     }
  //   };
  return (
    <div className="lg:mt-8 mt-6">
      <div className="text-center mb-6 lg:mb-8">
        <h2 className="text-[24px] lg:text-[32px]">{t("step2.heading")}</h2>
        <p className="text-base leading-[150%] tracking-[0%]">
          {t("step2.para")}
        </p>
      </div>

      <div className="customSelectDesign relative">
        <label className="block mb-2">{t("step2.label1")}</label>

        <Select
          isMulti
          name="companyInterest"
          options={companyInterestOptions}
          placeholder={t("step2.placeholder")}
          value={companyInterestOptions.filter(
            (
              opt // need to do
            ) => formik.values.companyInterest?.includes(opt.value)
          )}
          closeMenuOnSelect={false}
          onChange={(selected) => {
            const values = selected.map((item) => item.value);

            formik.setFieldValue("companyInterest", values);
          }}
          styles={{
            indicatorSeparator: () => ({
              display: "none", // Removes the separator
            }),
          }}
          components={{ DropdownIndicator }}
        />
        {formik.touched.companyInterest && formik.errors.companyInterest && (
          <p className="text-red-500 text-sm mt-1">
            {formik.errors.companyInterest}
          </p>
        )}
      </div>
      {croppingImage && (
        <CropperComponent
          image={croppingImage}
          onCropComplete={handleCropComplete}
          onCancel={handleCancelCrop}
        />
      )}

      <div>
        <label className="mb-2 block mt-6">{t("step2.label2")}</label>
        <input
          type="file"
          accept="image/*"
          className=""
          onChange={handleFileChange} // need to do
        />

        {formik.values.companyLogo && (
          <div className="relative mt-6 lg:mt-6">
            <img
              src={formik.values.companyLogo}
              alt="cover"
              width="100"
              height="100"
              className="mt-[14px] rounded-2xl object-cover h-[224px] w-fit"
            />
            <button
              className="bg-red-100 text-red-700 w-6 h-6 rounded-full  flex justify-center items-center absolute -top-1 cursor-pointer"
              type="button"
              // className={css.removeImageButton}
              onClick={() => handleRemoveCompanyLogo()}
            >
              <IoMdClose />
            </button>
          </div>
        )}
        {formik.touched.companyLogo && formik.errors.companyLogo && (
          <p className="text-red-500 text-sm mt-1">
            {formik.errors.companyLogo}
          </p>
        )}
      </div>

      <div>
        <label className="block mb-2 mt-6 font-medium text-black">
          {t("step2.label3")}
        </label>

        <div className="flex flex-wrap gap-2 mt-2">
          {checkOptions.map((option) => (
            <label
              key={option}
              className={`
        px-4 py-2 cursor-pointer rounded-sm text-sm font-medium
        ${
          formik.values.workingPeople === option
            ? "bg-black text-white shadow-[0px_4px_4px_rgba(0,0,0,0.25),_0px_4px_4px_rgba(0,0,0,0.25)]"
            : "bg-gray-100 text-black"
        }
      `}
            >
              <input
                type="radio"
                name="workingPeople"
                value={option} // Original value stays as "Just me"
                checked={formik.values.workingPeople === option}
                onChange={formik.handleChange}
                className="hidden"
              />
              {t(
                `step2.options.${option
                  .replace("+", "Plus")
                  .replace(/\s+/g, "")}`
              )}
            </label>
          ))}
        </div>

        {formik.touched.workingPeople && formik.errors.workingPeople && (
          <p className="text-red-500 text-sm mt-1">
            {formik.errors.workingPeople}
          </p>
        )}
      </div>

      <div className="flex justify-between items-center mt-[56px] mb-8 lg:mt-[48px]">
        <div>{t("step")} 2/3</div>
        <div>
          <button onClick={prev} className="btn secondaryBtn mr-4">
            {t("back")}
          </button>

          <button
            onClick={(e) => {
              e.preventDefault();
              next();
            }}
            className="primaryBtn"
          >
            {t("next")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BrandDetails;
