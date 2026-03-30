import { useTranslations } from "next-intl";
import React, { useState } from "react";
import { IoMdClose, IoMdImages } from "react-icons/io";
import CropperComponent from "./Cropper";
import { uploadToCloudinary } from "@/lib/helper";

const OnboardingImages = ({
  formik,
  handleAthletePhotos,
  handleRemoveAthletePhoto,
  next,
  prev,
}) => {
  const t = useTranslations("onboardingSport");
  const [croppingImage, setCroppingImage] = useState(null);

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setCroppingImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (croppedFile) => {
    uploadToCloudinary({
      file: croppedFile,
      folder: "onboarding_photos",
    }).then((uploaded) => {
      const updatedPhotos = [
        ...formik.values.onboardPhotos,
        {
          ...uploaded,
          isProfile: formik.values.onboardPhotos.length === 0,
        },
      ];
      formik.setFieldValue("onboardPhotos", updatedPhotos);
      setCroppingImage(null);
    });
  };

  const handleCancelCrop = () => {
    setCroppingImage(null);
  };

  return (
    <div className="lg:mt-8 mt-6 formInputs">
      <div className="text-center mb-6 lg:mb-8">
        <h2 className="text-[24px] lg:text-[32px] font-bold text-gray-800">
          {t("step3.heading")}
        </h2>
        <p className="text-base leading-[150%] text-gray-600 text-center">
          {t("step3.para")}
        </p>
      </div>

      {croppingImage && (
        <CropperComponent
          image={croppingImage}
          onCropComplete={handleCropComplete}
          onCancel={handleCancelCrop}
        />
      )}

      <div className="flex flex-wrap items-start gap-4">
        {/* Upload Area */}
        <div
          className={`w-full h-[202px] bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center transition-colors ${
            formik.values.onboardPhotos.length > 0
              ? " cursor-not-allowed opacity-50"
              : "hover:bg-gray-100 cursor-pointer"
          }`}
        >
          <input
            type="file"
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
            id="uploadImage"
            multiple={false}
            aria-label={t("step3.upload")}
            disabled={formik.values.onboardPhotos.length > 0}
          />
          <label
            htmlFor="uploadImage"
            className="cursor-pointer flex flex-col items-center justify-center h-full w-full"
          >
            <svg
              className="h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="mt-2 block text-sm font-medium text-gray-700">
              {formik.values.onboardPhotos.length > 0
                ? t("step3.uploaded")
                : t("step3.upload")}
            </span>
            <span className="mt-1 pl-5 text-xs text-gray-500">
              {t("step3.uploadPara")}
            </span>
          </label>
        </div>

        {/* Commented Code (Kept as Requested) */}
        {/* <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          id="uploadImage"
        />
        <label
          htmlFor="uploadImage"
          className="h-[202px] bg-[#0C0D060D] w-[161px] flex justify-center items-center rounded-xl"
        >
          <img
            src="/assets/images/defaultimg.png"
            className="w-[144px] h-[166px] rounded-2xl"
            alt=""
          />
        </label> */}

        {/* Image Previews */}
        {formik.values.onboardPhotos.map((data, i) => (
          <div key={i} className="relative w-[202px] h-[202px]">
            <img
              src={data.url}
              alt={`Uploaded photo ${i + 1}`}
              className="w-full h-full object-cover rounded-xl"
            />
            <button
              className="bg-red-100 text-red-700 w-6 h-6 rounded-full flex justify-center items-center absolute -right-2 -top-2 hover:bg-red-200 transition-colors"
              type="button"
              onClick={() => handleRemoveAthletePhoto(i)}
            >
              <IoMdClose />
            </button>
          </div>
        ))}
      </div>

      {/* Error Message */}
      {formik.touched.onboardPhotos && formik.errors.onboardPhotos && (
        <p className="text-red-500 text-sm mt-2">
          {formik.errors.onboardPhotos}
        </p>
      )}

      <div className="flex justify-between items-center mt-4 mb-10">
        <div>{t("step")} 3/4</div>
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

export default OnboardingImages;
