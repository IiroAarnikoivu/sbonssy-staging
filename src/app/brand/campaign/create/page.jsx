"use client";

import BasicsStep from "@/components/campaign/BasicsStep";
import CompensationStep from "@/components/campaign/CompensationStep";
import ContentRequirementsStep from "@/components/campaign/ContentRequirementsStep";
import CreativeAssetsStep from "@/components/campaign/CreativeAssetsStep";
import LegalStep from "@/components/campaign/LegalStep";
import ProductsStep from "@/components/campaign/ProductsStep";
import CropperComponent from "@/components/Cropper";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import IconsLibrary from "@/util/IconsLibrary";
import axios from "axios";
import { useFormik } from "formik";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { useTranslations } from "use-intl";
import { useLocale } from "next-intl";
import * as Yup from "yup";
import { configureYupLocale } from "@/lib/yupLocales";

export default function CampaignCreationForm() {
  const router = useRouter();
  const t = useTranslations("Brand.campaignCreate");
  const toastAlert = useTranslations("Sweetalert");
  const { user } = useAuthStore();
  const locale = useLocale();

  // Check if user has Shopify integration from the store
  const shopifyDetails = user?.onboardedDetails?.brand?.shopifyDetails;
  const hasShopifyIntegration = shopifyDetails?.myShopifyDomain;

  // Initialize auth store if needed
  useEffect(() => {
    if (!user) {
      useAuthStore.getState().initialize();
    }
  }, [user]);

  const [step, setStep] = useState(0);
  const [uploading, setUploading] = useState({
    logos: false,
    photos: false,
    videos: false,
    examplePosts: false,
    coverImages: false,
  });
  const [submitError, setSubmitError] = useState("");
  const [showCropper, setShowCropper] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [currentField, setCurrentField] = useState("");

  // Ensure no stale uploading flags remain set
  const resetUploading = () =>
    setUploading({
      logos: false,
      photos: false,
      videos: false,
      examplePosts: false,
      coverImages: false,
    });

  // Ensure Yup uses active locale and rebuild schemas when locale or Shopify state changes
  configureYupLocale(locale);
  const validationSchemas = useMemo(
    () => [
      Yup.object({
        basics: Yup.object({
          campaignType: Yup.string()
            .oneOf(["public", "apply", "private"])
            .required(),
          category: Yup.string().required(),
          coverImages: Yup.array()
            .of(
              Yup.object({
                url: Yup.string().required(),
                publicId: Yup.string().required(),
              })
            )
            .min(1)
            .required(),
          title: Yup.string().max(15).required(),
          description: Yup.string().required(),
          startDate: Yup.date().required(),
          endDate: Yup.date().when("isOngoing", {
            is: false,
            then: (schema) => schema.min(Yup.ref("startDate")).required(),
            otherwise: (schema) => schema.nullable(),
          }),
          isOngoing: Yup.boolean(),
          targetRegions: Yup.array().of(
            Yup.object({
              value: Yup.string()
                .oneOf([
                  "north_america",
                  "europe",
                  "asia",
                  "africa",
                  "south_america",
                  "australia",
                ])
                .required(),
              label: Yup.string().required(),
            })
          ),
        }),
      }),
      Yup.object({
        products: Yup.array()
          .of(
            Yup.object({
              shopifyProductId: Yup.string().required(),
              name: Yup.string().required(),
              description: Yup.string(),
              price: Yup.string().required(),
              currency: Yup.string().required(),
              image: Yup.string(),
            })
          )
          .when([], {
            is: () => !!hasShopifyIntegration,
            then: (schema) => schema.min(1, "Please select at least one product to continue."),
            otherwise: (schema) => schema.min(0),
          })
          .default([]),
      }),
      Yup.object({
        compensation: Yup.object({
          type: Yup.string()
            .oneOf([
              "pay-per-sale",
              "pay-per-lead",
              "pay-per-click",
              "flat-fee",
            ])
            .required()
            .test("shopify-restriction", undefined, function (value) {
              const root =
                this?.from?.[1]?.value || this?.from?.[0]?.value || {};
              const hasSelectedProducts =
                Array.isArray(root?.products) && root.products.length > 0;
              if (hasShopifyIntegration && hasSelectedProducts) {
                return value === "pay-per-sale";
              }
              return true;
            }),
          commission: Yup.number().when("type", {
            is: (type) => type === "pay-per-sale",
            then: (schema) => schema.min(0).max(100).required(),
            otherwise: (schema) => schema.nullable(),
          }),
          amount: Yup.number().when("type", {
            is: (type) =>
              ["pay-per-lead", "pay-per-click", "flat-fee"].includes(type),
            then: (schema) => schema.min(0).required(),
            otherwise: (schema) => schema.nullable(),
          }),
          gifting: Yup.boolean(),
          duration: Yup.number().oneOf([14, 30, 60]).required(),
          affiliateLinkDestination: Yup.string()
            .transform((v) => {
              let s = typeof v === "string" ? v.trim() : v;
              if (!s) return s;
              if (s === "https://" || s === "http://") return "";
              if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
              return s;
            })
            .when(["type"], function (type, schema) {
              // Determine if affiliate link should be optional:
              // optional when Shopify is integrated AND products are selected AND type is pay-per-sale
              const root =
                this?.from?.[1]?.value || this?.from?.[0]?.value || {};
              const hasSelectedProducts =
                Array.isArray(root?.products) && root.products.length > 0;
              const optional =
                hasShopifyIntegration &&
                hasSelectedProducts &&
                type === "pay-per-sale";

              if (optional) {
                // If provided, must be a valid URL; empty is allowed
                return schema.test(
                  "optional-valid-url",
                  this.createError({ message: "Invalid URL" }),
                  (val) => {
                    if (!val || val === "") return true;
                    try {
                      return Yup.string().url().isValidSync(val);
                    } catch (e) {
                      return false;
                    }
                  }
                );
              }
              // Otherwise required and must be a valid URL
              return schema.url().required();
            }),
        }),
      }),
      Yup.object({
        creatorProfile: Yup.object({
          contentRequirements: Yup.string().required(),
          requiresApproval: Yup.boolean(),
        }),
      }),
      Yup.object({
        assets: Yup.object({
          logos: Yup.array().of(
            Yup.object({ url: Yup.string(), publicId: Yup.string() })
          ),
          photos: Yup.array().of(
            Yup.object({ url: Yup.string(), publicId: Yup.string() })
          ),
          videos: Yup.array().of(
            Yup.object({ url: Yup.string(), publicId: Yup.string() })
          ),
          examplePosts: Yup.array().of(
            Yup.object({
              url: Yup.string(),
              publicId: Yup.string(),
              mediaType: Yup.string().oneOf(["image", "video"]),
            })
          ),
          styleGuide: Yup.object({
            fonts: Yup.string(),
            colors: Yup.string(),
            guidelines: Yup.string(),
          }),
        }),
      }),
      Yup.object({
        legal: Yup.object({
          // termsAgreed: Yup.boolean().oneOf([true]).required(),
          ftcDisclosure: Yup.boolean(),
          customTerms: Yup.string().required(),
        }),
      }),
    ],
    [locale, hasShopifyIntegration]
  );

  const todayISO = new Date().toISOString().slice(0, 10);
  const initialValues = {
    basics: {
      campaignType: "public",
      category: "apparel",

      title: "",
      description: "",
      coverImages: [],
      startDate: todayISO,
      endDate: "",
      isOngoing: false,
      targetRegions: [],
    },
    products: [],
    creatorProfile: {
      //   followerRange: { min: "", max: "" },
      //   platforms: [],
      //   ambassadorTypes: [],
      contentRequirements: "",
      requiresApproval: false,
    },
    compensation: {
      type: "",
      commission: "",
      amount: "",
      gifting: false,
      duration: "",
      affiliateLinkDestination: "https://",
    },
    assets: {
      logos: [],
      photos: [],
      videos: [],
      examplePosts: [],
      styleGuide: {
        fonts: "",
        colors: "",
        guidelines: "",
      },
    },
    goals: {
      clicks: "",
      sales: "",
      signups: "",
      budgetCap: "",
      products: [],
      shippingRegions: [],
      shippingRequirements: "",
    },
    legal: {
      // termsAgreed: false,
      ftcDisclosure: true,
      customTerms: "",
    },
  };

  const platformOptions = [
    { value: "instagram", label: t("platformOptions.Instagram") },
    { value: "youtube", label: t("platformOptions.YouTube") },
    { value: "tiktok", label: t("platformOptions.tikTok") },
    { value: "x", label: t("platformOptions.X") },
    { value: "facebook", label: t("platformOptions.facebook") },
  ];

  const regionOptions = [
    { value: "north_america", label: t("regionOptions.North") },
    { value: "europe", label: t("regionOptions.Europe") },
    { value: "asia", label: t("regionOptions.Asia") },
    { value: "africa", label: t("regionOptions.Africa") },
    { value: "south_america", label: t("regionOptions.South") },
    { value: "australia", label: t("regionOptions.Australia") },
  ];

  const ambassadorTypeOptions = [
    { value: "athlete", label: t("ambassadorTypeOptions.Athlete") },
    { value: "team", label: t("ambassadorTypeOptions.Team") },
    { value: "influencer", label: t("ambassadorTypeOptions.Influencer") },
    { value: "para-athlete", label: t("ambassadorTypeOptions.Para-Athlete") },
    { value: "coach", label: t("ambassadorTypeOptions.Coach") },
    { value: "ex-athlete", label: t("ambassadorTypeOptions.Ex-Athlete") },
  ];

  const validateStep = async (currentStep) => {
    await formik.validateForm();

    const stepFields = {
      0: () => [
        "basics.campaignType",
        "basics.category",
        "basics.title",
        "basics.description",
        "basics.startDate",
        "basics.coverImages",
        "basics.isOngoing",
        "basics.targetRegions",
        ...(formik.values.basics.isOngoing ? [] : ["basics.endDate"]),
      ],
      1: () => (hasShopifyIntegration ? ["products"] : []),
      2: () => [
        "compensation.type",
        "compensation.gifting",
        "compensation.duration",
        // Include affiliate link only when it's required
        ...(() => {
          const hasSelectedProducts =
            Array.isArray(formik.values.products) &&
            formik.values.products.length > 0;
          const pps = formik.values.compensation.type === "pay-per-sale";
          const optional = hasShopifyIntegration && hasSelectedProducts && pps;
          return optional ? [] : ["compensation.affiliateLinkDestination"];
        })(),
        ...(formik.values.compensation.type === "pay-per-sale"
          ? ["compensation.commission"]
          : []),
        ...(["pay-per-lead", "pay-per-click", "flat-fee"].includes(
          formik.values.compensation.type
        )
          ? ["compensation.amount"]
          : []),
      ],
      3: () => [
        "creatorProfile.contentRequirements",
        "creatorProfile.requiresApproval",
      ],
      4: () => [
        "assets.logos",
        "assets.photos",
        "assets.videos",
        "assets.examplePosts",
        "assets.styleGuide.fonts",
        "assets.styleGuide.colors",
        "assets.styleGuide.guidelines",
      ],
      4: () => [
        // "legal.termsAgreed",
        "legal.ftcDisclosure",
        "legal.customTerms",
      ],
    };

    const fields = stepFields[currentStep] ? stepFields[currentStep]() : [];
    const errors = await formik.validateForm();
    const stepErrors = fields.filter((field) => {
      const getNestedError = (obj, path) => {
        return path.split(".").reduce((current, key) => {
          return current ? current[key] : undefined;
        }, obj);
      };
      return !!getNestedError(errors, field);
    });

    if (stepErrors.length > 0) {
      const touched = fields.reduce((acc, field) => {
        let current = acc;
        const parts = field.split(".");
        for (let i = 0; i < parts.length - 1; i++) {
          current = current[parts[i]] = current[parts[i]] || {};
        }
        current[parts[parts.length - 1]] = true;
        return acc;
      }, {});
      formik.setTouched(touched, true);
      return false;
    }

    return true;
  };

  const next = async () => {
    const isStepValid = await validateStep(step);
    if (isStepValid && step < validationSchemas.length - 1) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleFileUpload = async (e, field) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setCurrentField(field);
      const file = files[0];
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => {
          // Ensure uploading flags are cleared while user is cropping
          resetUploading();
          setImageToCrop(reader.result);
          setShowCropper(true);
        };
        reader.readAsDataURL(file);
      } else {
        // Handle non-image files (e.g., videos) directly
        setUploading((prev) => ({ ...prev, [field]: true }));
        const uploaded = await uploadToCloudinary(file);
        const existingAssets =
          field === "coverImages"
            ? formik.values.basics[field] || []
            : formik.values.assets[field] || [];

        const updatedAssets =
          field === "coverImages"
            ? [uploaded]
            : [
                ...existingAssets,
                { ...uploaded, isProfile: existingAssets.length === 0 },
              ];

        formik.setFieldValue(
          field === "coverImages" ? "basics.coverImages" : `assets.${field}`,
          updatedAssets
        );
        setUploading((prev) => ({ ...prev, [field]: false }));
      }
    } catch (error) {
      setSubmitError("Failed to process file. Please try again.");
    }
  };

  const handleCropComplete = async (croppedImage) => {
    try {
      setUploading((prev) => ({ ...prev, [currentField]: true }));

      const uploaded = await uploadToCloudinary(croppedImage);
      const existingAssets =
        currentField === "coverImages"
          ? formik.values.basics[currentField] || []
          : formik.values.assets[currentField] || [];

      const updatedAssets =
        currentField === "coverImages"
          ? [uploaded]
          : [
              ...existingAssets,
              { ...uploaded, isProfile: existingAssets.length === 0 },
            ];

      formik.setFieldValue(
        currentField === "coverImages"
          ? "basics.coverImages"
          : `assets.${currentField}`,
        updatedAssets
      );
    } catch (error) {
      setSubmitError("Failed to upload cropped image. Please try again.");
    } finally {
      setUploading((prev) => ({ ...prev, [currentField]: false }));
      setShowCropper(false);
      setImageToCrop(null);
      setCurrentField("");
    }
  };

  const handleRemovePhoto = async (field, index) => {
    try {
      const currentAssets = [...formik.values.assets[field]];
      currentAssets.splice(index, 1);
      formik.setFieldValue(`assets.${field}`, currentAssets);
    } catch (error) {
      setSubmitError("Failed to remove photo. Please try again.");
    }
  };

  const uploadToCloudinary = async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append(
        "upload_preset",
        process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
      );

      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/upload`,
        formData
      );

      const mediaType = file.type?.startsWith("image/")
        ? "image"
        : file.type?.startsWith("video/")
        ? "video"
        : null;

      return {
        url: response.data.secure_url,
        publicId: response.data.public_id,
        ...(mediaType && { mediaType }),
      };
    } catch (error) {
      throw new Error("Failed to upload to Cloudinary");
    }
  };

  const formik = useFormik({
    initialValues,
    validationSchema: validationSchemas[step],
    onSubmit: async (values, { setSubmitting }) => {
      const payload = {
        ...values,
        basics: {
          ...values.basics,
          targetRegions: values.basics.targetRegions.map(
            (region) => region.value
          ),
        },
        creatorProfile: {
          ...values.creatorProfile,
          // platforms: values.creatorProfile.platforms.map((opt) => opt.value),
          // ambassadorTypes: values.creatorProfile.ambassadorTypes.map(
          //   (opt) => opt.value
          // ),
        },
        goals: {
          ...values.goals,
          shippingRegions: values.goals.shippingRegions.map((opt) => opt.value),
        },
      };

      try {
        const resp = await api.post("/campaign", payload);

        if (resp) {
          Swal.fire({
            title: toastAlert("cmgCreated"),
            position: "top-right",
            icon: "success",
            toast: true,
            showConfirmButton: false,
            timerProgressBar: false,
            timer: 5000,
          });
          router.push("/brand/campaign");
        }
      } catch (error) {
        Swal.fire({
          title: toastAlert("cmgCreatedFailed"),
          position: "top-right",
          icon: "error",
          toast: true,
          showConfirmButton: false,
          timerProgressBar: false,
          timer: 5000,
        });
      } finally {
        setSubmitting(false);
      }
    },
  });

  const renderStep = () => {
    const stepProps = {
      values: formik.values,
      errors: formik.errors,
      touched: formik.touched,
      handleChange: formik.handleChange,
      handleBlur: formik.handleBlur,
      setFieldValue: formik.setFieldValue,
      handleFileUpload,
      handleRemovePhoto,
      uploading,
      setUploading,
      next,
    };

    switch (step) {
      case 0:
        return <BasicsStep {...stepProps} regionOptions={regionOptions} />;
      case 1:
        return <ProductsStep {...stepProps} />;
      case 2:
        return <CompensationStep {...stepProps} />;
      // case 2:
      //   return (
      //     <CreatorProfileStep
      //       {...stepProps}
      //       platformOptions={platformOptions}
      //       ambassadorTypeOptions={ambassadorTypeOptions}
      //     />
      //   );
      case 3:
        return <ContentRequirementsStep {...stepProps} />;
      case 4:
        return <CreativeAssetsStep {...stepProps} />;
      case 5:
        return <LegalStep {...stepProps} />;
      default:
        return null;
    }
  };

  const onboardSteps = [
    { step: 1 },
    { step: 2 },
    { step: 3 },
    { step: 4 },
    { step: 5 },
    { step: 6 },
  ];

  return (
    <div className="lg:max-w-3xl mx-auto px-5 lg:px-0 pb-7 bg-white rounded-lg pt-8 lg:pt-0">
      <div className="w-full flex gap-0 items-center mt-[28px] mb-8 lg:mt-[48px]">
        {onboardSteps.map((i, index) => (
          <Fragment key={index}>
            <div
              className={`min-w-8 min-h-8 flex justify-center items-center rounded-full border ${
                i.step < step + 1
                  ? "bg-[#F2F2F2] border-[#F2F2F2] text-[#0c0d06]"
                  : i.step === step + 1
                  ? "bg-[#f26915] border-[#f26915] text-white"
                  : "bg-[#F2F2F2] border-[#0C0D0626] text-textColor"
              }`}
            >
              {i.step < step + 1 ? <IconsLibrary name={"stepDone"} /> : i.step}
            </div>
            {i.step !== onboardSteps.length && (
              <span className="block w-full h-[1px] bg-[#0C0D0626]" />
            )}
          </Fragment>
        ))}
      </div>

      {/* <div className="text-center mb-6 lg:mb-8">
        <h2 className="text-[24px] lg:text-[32px]">{t("heading")}</h2>
        <p className="text-base leading-[150%] tracking-[0%]">{t("para")}</p>
      </div> */}

      {submitError && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          {submitError}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (step === validationSchemas.length - 1) {
            formik.handleSubmit(e);
          }
        }}
        className=""
      >
        {renderStep()}

        {showCropper && imageToCrop && (
          <CropperComponent
            image={imageToCrop}
            onCropComplete={handleCropComplete}
            onCancel={() => {
              // Reset uploading flags on cancel to avoid stuck state
              resetUploading();
              setShowCropper(false);
              setImageToCrop(null);
              setCurrentField("");
            }}
            isUploading={Boolean(currentField && uploading[currentField])}
          />
        )}

        <div className="flex justify-between pt-6">
          {step > 0 ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setStep(step - 1);
              }}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 cursor-pointer"
              disabled={formik.isSubmitting}
            >
              {t("back")}
            </button>
          ) : (
            <Link
              href="/brand/campaign"
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 cursor-pointer"
            >
              {t("cancel")}
            </Link>
          )}

          {step < validationSchemas.length - 1 ? (
            <button
              type="button"
              onClick={next}
              className="px-6 py-2 bg-[#f26915] text-white rounded-lg cursor-pointer hover:bg-[#d65e13]"
              disabled={formik.isSubmitting}
            >
              {t("next")}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                // Explicitly call formik.submitForm only when this button is clicked
                formik.submitForm();
              }}
              className="px-6 py-2 bg-[#f26915] text-white rounded-lg cursor-pointer hover:bg-[#d65e13]"
              disabled={formik.isSubmitting}
            >
              {formik.isSubmitting ? t("creating") : t("create")}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
