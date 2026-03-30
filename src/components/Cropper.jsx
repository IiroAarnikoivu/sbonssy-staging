import React, { useRef, useEffect } from "react";
import Cropper from "react-cropper";
import "cropperjs/dist/cropper.css";
import { useTranslations } from "use-intl";

const CropperComponent = ({
  image,
  onCropComplete,
  onCancel,
  isUploading = false,
}) => {
  const t = useTranslations("Brand.campaignCreate");
  const cropperRef = useRef(null);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const handleCrop = () => {
    if (isUploading) return; // Prevent duplicate actions while uploading
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      cropper.getCroppedCanvas().toBlob(
        (blob) => {
          if (!blob) {
            console.error("Failed to create blob from cropped image");
            return;
          }
          const file = new File([blob], "cropped-image.jpg", {
            type: "image/jpeg",
          });
          onCropComplete(file);
        },
        "image/jpeg",
        0.95
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <div className="relative w-full h-[400px]">
          <Cropper
            src={image}
            ref={cropperRef}
            style={{ height: "100%", width: "100%" }}
            // Enforce fixed 1:1 (square) cropping while allowing zoom/drag
            aspectRatio={1}
            initialAspectRatio={1}
            viewMode={2}
            dragMode="move"
            guides={true}
            autoCropArea={0.9}
            background={false}
            responsive={true}
            checkOrientation={false}
            zoomOnWheel={true}
            movable={true}
            zoomable={true}
            cropBoxResizable={true}
            minCropBoxWidth={50}
            minCropBoxHeight={50}
          />
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={handleCrop}
            className={`px-6 py-2 bg-[#f26915] text-white rounded-lg transition-colors ${
              isUploading
                ? "opacity-60 cursor-not-allowed"
                : "hover:bg-[#d65e13]"
            }`}
            disabled={isUploading}
          >
            {isUploading ? (
              <span className="inline-flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  ></path>
                </svg>
                {"Uploading..."}
              </span>
            ) : (
              t("upload")
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CropperComponent;
