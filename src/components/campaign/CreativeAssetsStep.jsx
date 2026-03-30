"use client";

import { useTranslations } from "next-intl";

const CreativeAssetsStep = ({
  values,
  errors,
  touched,
  handleChange,
  handleBlur,
  handleFileUpload,
  uploading,
  setUploading,
  handleRemovePhoto,
}) => {
  const handleImageSelect = (event, name) => {
    handleFileUpload(event, name);
  };
  const t = useTranslations("Brand.campaignCreate.step5");
  const renderPreview = (items, type) => {
    const t = useTranslations("Brand.campaignCreate.step5");
    if (items.length === 0) return null;

    return (
      <div className="mt-3">
        <h4 className="text-sm font-medium text-gray-700 mb-1">
          {t("Uploaded")}:
        </h4>
        <div className="flex flex-wrap gap-2">
          {items.map((item, index) => (
            <div key={index} className="relative group">
              {item.url ? (
                type === "videos" ? (
                  <video
                    src={item.url}
                    className="h-20 w-20 object-cover rounded"
                    controls
                  />
                ) : (
                  <img
                    src={item.url}
                    alt={`${type} preview`}
                    className="h-20 w-20 object-cover rounded"
                  />
                )
              ) : (
                <div className="h-20 w-20 bg-gray-200 rounded flex items-center justify-center text-sm text-gray-500">
                  {t("Invalid")}
                </div>
              )}
              <button
                type="button"
                onClick={() => handleRemovePhoto(type, index)}
                className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={`Remove ${type} item`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6 lg:mb-8">
        <h2 className="text-[24px] lg:text-[32px]">{t("heading")}</h2>
        <p className="text-base leading-[150%] tracking-[0%]">
          {t("subHeading")}
        </p>
      </div>
      <div className="mt-6">
        <label className="block mb-2 text-gray-700">{t("logo")}</label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
          <input
            type="file"
            onChange={(e) => {
              handleImageSelect(e, "logos");
            }}
            multiple
            accept="image/*"
            className="hidden cursor-pointer"
            id="logo-upload"
          />
          <label
            htmlFor="logo-upload"
            className="cursor-pointer flex flex-col items-center justify-center"
          >
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
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
              {uploading.logos ? t("uploading") : t("logos")}
            </span>
            <span className="mt-1 text-xs text-gray-500">{t("desc")}</span>
          </label>
        </div>
        {touched.assets?.logos && errors.assets?.logos && (
          <p className="mt-1 text-sm text-red-600">{errors.assets?.logos}</p>
        )}
        {renderPreview(values.assets.logos, "logos")}
      </div>

      <div className="mt-6 md:mt-[55px]">
        <label className="block mb-2 text-gray-700">{t("product")}</label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
          <input
            type="file"
            onChange={(e) => {
              handleImageSelect(e, "photos");
            }}
            multiple
            accept="image/*"
            className="hidden cursor-pointer"
            id="photo-upload"
          />
          <label
            htmlFor="photo-upload"
            className="cursor-pointer flex flex-col items-center justify-center"
          >
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
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
              {uploading.photos ? "Uploading..." : "Click to upload photo(s)"}
            </span>
            <span className="mt-1 text-xs text-gray-500">{t("desc")}</span>
          </label>
        </div>
        {renderPreview(values.assets.photos, "photos")}
      </div>

      <div className="mt-6 md:mt-[55px]">
        <label className="block mb-2 text-gray-700">{t("video")}</label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
          <input
            type="file"
            onChange={(e) => {
              handleFileUpload(e, "videos");
              // uploading flag is managed in parent during actual upload
            }}
            multiple
            accept="video/*"
            className="hidden cursor-pointer"
            id="video-upload"
          />
          <label
            htmlFor="video-upload"
            className="cursor-pointer flex flex-col items-center justify-center"
          >
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
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
              {uploading.videos ? "Uploading..." : "Click to upload video(s)"}
            </span>
            <span className="mt-1 text-xs text-gray-500">{t("descv")}</span>
          </label>
        </div>
        {renderPreview(values.assets.videos, "videos")}
      </div>

      <div className="mt-6 md:mt-[55px]">
        <label className="block mb-2 text-gray-700">{t("style")}</label>
        <div className="space-y-4 mt-6">
          <div>
            <label className="block mb-1 text-sm text-gray-700">
              {t("Fonts")}
            </label>
            <textarea
              name="assets.styleGuide.fonts"
              value={values.assets.styleGuide.fonts}
              onChange={handleChange}
              onBlur={handleBlur}
              className="forms w-full p-3 border rounded-lg focus:ring-gray-500 focus:border-gray-500 !h-auto cursor-pointer"
              rows={3}
              placeholder={t("placeholder1")}
            />
          </div>
          <div className="mt-6 md:mt-[55px]">
            <label className="block mb-1 text-sm text-gray-700">
              {t("Colors")}
            </label>
            <textarea
              name="assets.styleGuide.colors"
              value={values.assets.styleGuide.colors}
              onChange={handleChange}
              onBlur={handleBlur}
              className="forms w-full p-3 border rounded-lg focus:ring-gray-500 focus:border-gray-500 !h-auto"
              rows={3}
              placeholder={t("placeholder2")}
            />
          </div>
          <div className="mt-6 md:mt-[55px]">
            <label className="block mb-1 text-sm text-gray-700">
              {t("Guidelines")}
            </label>
            <textarea
              name="assets.styleGuide.guidelines"
              value={values.assets.styleGuide.guidelines}
              onChange={handleChange}
              onBlur={handleBlur}
              className="forms w-full p-3 border rounded-lg focus:ring-gray-500 focus:border-gray-500 !h-auto"
              rows={3}
              placeholder={t("placeholder3")}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 md:mt-[55px]">
        <label className="block mb-2 text-gray-700">{t("posts")}</label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
          <input
            type="file"
            onChange={(e) => {
              handleFileUpload(e, "examplePosts");
              // uploading flag is managed in parent during actual upload
            }}
            multiple
            accept="image/*,video/*"
            className="hidden cursor-pointer"
            id="example-upload"
          />
          <label
            htmlFor="example-upload"
            className="cursor-pointer flex flex-col items-center justify-center"
          >
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
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
              {uploading.examplePosts ? t("uploading") : t("upload")}
            </span>
            <span className="mt-1 text-xs text-gray-500">{t("desci")}</span>
          </label>
        </div>
        {renderPreview(values.assets.examplePosts, "examplePosts")}
      </div>
    </div>
  );
};

export default CreativeAssetsStep;
