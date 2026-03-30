"use client";

import CropperComponent from "@/components/Cropper";
import Loader from "@/components/Loader";
import BasicsStep from "@/components/campaign/BasicsStep";
import CompensationStep from "@/components/campaign/CompensationStep";
import ContentRequirementsStep from "@/components/campaign/ContentRequirementsStep";
import CreativeAssetsStep from "@/components/campaign/CreativeAssetsStep";
import LegalStep from "@/components/campaign/LegalStep";
import ProductsStep from "@/components/campaign/ProductsStep";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import IconsLibrary from "@/util/IconsLibrary";
import axios from "axios";
import { useFormik } from "formik";
import { useLocale, useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import * as Yup from "yup";
import { configureYupLocale } from "@/lib/yupLocales";
const Select = dynamic(() => import("react-select"), { ssr: false });

export default function CampaignCreationForm() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id;
  const isEditMode = !!campaignId;
  const [step, setStep] = useState(0);
  const [showCropper, setShowCropper] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [currentField, setCurrentField] = useState("");
  const [uploading, setUploading] = useState({
    logos: false,
    photos: false,
    videos: false,
    examplePosts: false,
    coverImages: false,
  });
  const [submitError, setSubmitError] = useState("");
  const [isLoading, setIsLoading] = useState(isEditMode);
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

  // Select options, aligned with Mongoose enum values
  const platformOptions = [
    { value: "instagram", label: "Instagram" },
    { value: "youtube", label: "YouTube" },
    { value: "tiktok", label: "TikTok" },
    { value: "twitter", label: "Twitter" },
    { value: "facebook", label: "Facebook" },
  ];

  const regionOptions = [
    { value: "north_america", label: "North America" },
    { value: "europe", label: "Europe" },
    { value: "asia", label: "Asia" },
    { value: "africa", label: "Africa" },
    { value: "south_america", label: "South America" },
    { value: "australia", label: "Australia" },
  ];

  const ambassadorTypeOptions = [
    { value: "athlete", label: "Athlete" },
    { value: "team", label: "Team" },
    { value: "influencer", label: "Influencer" },
    { value: "para-athlete", label: "Para-Athlete" },
    { value: "coach", label: "Coach" },
    { value: "ex-athlete", label: "Ex-Athlete" },
  ];

  // Validation schemas localized with Yup locale and useMemo
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
            .max(1)
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
          .min(0)
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
            then: (schema) => schema.min(0).required(),
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
              if (s === "https://" || s === "http://") return ""; // treat bare protocols as empty
              if (!/^https?:\/\//i.test(s)) s = `https://${s}`; // auto-prefix
              return s;
            })
            .when(["type"], function (type, schema) {
              const root =
                this?.from?.[1]?.value || this?.from?.[0]?.value || {};
              const hasSelectedProducts =
                Array.isArray(root?.products) && root.products.length > 0;
              const optional =
                hasShopifyIntegration &&
                hasSelectedProducts &&
                type === "pay-per-sale";

              if (optional) {
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

  // Initial form values, aligned with Mongoose schema
  const initialValues = {
    basics: {
      campaignType: "public",
      category: "apparel",
      title: "",
      description: "",
      coverImages: [],
      startDate: "",
      endDate: "",
      isOngoing: false,
      targetRegions: [],
    },
    products: [],
    creatorProfile: {
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
      ftcDisclosure: true,
      customTerms: "",
    },
  };

  // Formik setup
  const formik = useFormik({
    initialValues,
    validationSchema: validationSchemas[step],
    onSubmit: async (values, { setSubmitting }) => {
      setSubmitError("");
      try {
        // Transform multi-select fields to backend format (strings)
        if (step === validationSchemas.length - 1) {
          const payload = {
            ...values,
            basics: {
              ...values.basics,
              targetRegions: Array.isArray(values.basics.targetRegions)
                ? values.basics.targetRegions.map((region) =>
                    typeof region === "string" ? region : region.value
                  )
                : [],
            },
            products: Array.isArray(values.products)
              ? values.products.map((p) => ({
                  shopifyProductId: String(p.shopifyProductId || p._id || ""),
                  name: String(p.name || ""),
                  description: String(p.description || ""),
                  price: String(p.price || "0.00"),
                  currency: String(p.currency || "USD"),
                  image: String(p.image || ""),
                }))
              : [],
            creatorProfile: {
              ...values.creatorProfile,
            },
            goals: {
              ...values.goals,
              shippingRegions: Array.isArray(values.goals.shippingRegions)
                ? values.goals.shippingRegions.map((opt) =>
                    typeof opt === "string" ? opt : opt.value
                  )
                : [],
            },
          };

          if (isEditMode) {
            Swal.fire({
              title: toastAlert("sure"),
              text: toastAlert("saveCmg"),
              icon: "warning",
              showCancelButton: true,
              confirmButtonText: toastAlert("save"),
              cancelButtonText: toastAlert("cancel"),
              customClass: {
                confirmButton: "confirmButton",
                cancelButton: "cancelButton",
              },
            }).then(async (result) => {
              if (result.isConfirmed) {
                const resp = await api.put(
                  `/campaign?campaignId=${campaignId}`,
                  payload
                );
                if (resp) {
                  Swal.fire({
                    title: toastAlert("changes"),
                    position: "top-right",
                    icon: "success",
                    toast: true,
                    showConfirmButton: false,
                    timerProgressBar: false,
                    timer: 5000,
                  });
                  router.push("/brand/campaign");
                }
              }
            });
          } else {
            const resp = await api.post("/campaign", payload);
            if (resp) {
              Swal.fire({
                title: toastAlert("created"),
                position: "top-right",
                icon: "success",
                toast: true,
                showConfirmButton: false,
                timerProgressBar: false,
                timer: 5000,
              });
              router.push("/brand/campaign");
            }
          }
        }
      } catch (error) {
        Swal.fire({
          title: toastAlert("error"),
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

  // Fetch campaign data in edit mode
  useEffect(() => {
    if (isEditMode) {
      const fetchCampaign = async () => {
        try {
          setIsLoading(true);
          const response = await api.get(`/campaign/${campaignId}`);
          const campaign = response.data.data;

          if (!campaign) {
            throw new Error("Campaign data is missing");
          }

          // Initialize with defaults to prevent undefined errors
          const safeCampaign = {
            basics: campaign.basics || {},
            creatorProfile: campaign.creatorProfile || {},
            compensation: campaign.compensation || {},
            assets: campaign.assets || {},
            goals: campaign.goals || {},
            legal: campaign.legal || {},
            products: campaign.products || [],
          };

          // Map multi-select fields to { value, label } format
          const mapToSelectOptions = (values, options) => {
            if (!Array.isArray(values)) {
              return [];
            }
            return values.map((value) => {
              const cleanValue =
                typeof value === "string" ? value.replace(/"/g, "") : value;
              const option = options.find((opt) => opt.value === cleanValue);
              return option || { value: cleanValue, label: cleanValue };
            });
          };

          const formattedCampaign = {
            ...initialValues,
            basics: {
              ...initialValues.basics,
              ...safeCampaign.basics,
              campaignType: safeCampaign.basics.campaignType || "public",
              category: safeCampaign.basics.category || "apparel",
              title: safeCampaign.basics.title || "",
              description: safeCampaign.basics.description || "",
              coverImages: safeCampaign.assets.logos || [],
              startDate: safeCampaign.basics.startDate
                ? new Date(safeCampaign.basics.startDate)
                    .toISOString()
                    .split("T")[0]
                : "",
              endDate: safeCampaign.basics.endDate
                ? new Date(safeCampaign.basics.endDate)
                    .toISOString()
                    .split("T")[0]
                : "",
              isOngoing: safeCampaign.basics.isOngoing ?? false,
              targetRegions: mapToSelectOptions(
                safeCampaign.basics.targetRegions || [],
                regionOptions
              ),
            },
            products: safeCampaign.products || [],
            creatorProfile: {
              ...initialValues.creatorProfile,
              ...safeCampaign.creatorProfile,
              contentRequirements:
                safeCampaign.creatorProfile.contentRequirements || "",
              requiresApproval:
                safeCampaign.creatorProfile.requiresApproval ?? false,
            },
            compensation: {
              ...initialValues.compensation,
              ...safeCampaign.compensation,
              type: safeCampaign.compensation.type || "",
              commission: safeCampaign.compensation.commission || "",
              amount: safeCampaign.compensation.amount || "",
              gifting: safeCampaign.compensation.gifting ?? false,
              duration: safeCampaign.compensation.duration || "",
              affiliateLinkDestination:
                safeCampaign.compensation.affiliateLinkDestination ||
                "https://",
            },
            assets: {
              ...initialValues.assets,
              ...safeCampaign.assets,
              logos: safeCampaign.basics.coverImages || [],
              photos: safeCampaign.assets.photos || [],
              videos: safeCampaign.assets.videos || [],
              examplePosts: safeCampaign.assets.examplePosts || [],
              styleGuide: {
                ...initialValues.assets.styleGuide,
                ...safeCampaign.assets.styleGuide,
                fonts: safeCampaign.assets.styleGuide?.fonts || "",
                colors: safeCampaign.assets.styleGuide?.colors || "",
                guidelines: safeCampaign.assets.styleGuide?.guidelines || "",
              },
            },
            goals: {
              ...initialValues.goals,
              ...safeCampaign.goals,
              clicks: safeCampaign.goals.clicks || "",
              sales: safeCampaign.goals.sales || "",
              signups: safeCampaign.goals.signups || "",
              budgetCap: safeCampaign.goals.budgetCap || "",
              products: safeCampaign.goals.products || [],
              shippingRegions: mapToSelectOptions(
                safeCampaign.goals.shippingRegions || [],
                regionOptions
              ),
              shippingRequirements:
                safeCampaign.goals.shippingRequirements || "",
            },
            legal: {
              ...initialValues.legal,
              ...safeCampaign.legal,

              ftcDisclosure: safeCampaign.legal.ftcDisclosure ?? true,
              customTerms: safeCampaign.legal.customTerms || "",
            },
          };

          formik.setValues(formattedCampaign);
        } catch (error) {
          setSubmitError(error.message || "Failed to fetch campaign details");
        } finally {
          setIsLoading(false);
        }
      };
      fetchCampaign();
    }
  }, [campaignId, isEditMode]);

  // Validate current step
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
      1: () => [
        // Products step is optional - no validation required
      ],
      2: () => [
        "compensation.type",
        "compensation.gifting",
        "compensation.duration",
        // Include affiliate link only when it's required (not Shopify+products+PPS)
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
      5: () => [
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
      formik.setTouched(touched);
      return false;
    }

    return true;
  };

  // Proceed to next step
  const next = async () => {
    const isStepValid = await validateStep(step);
    if (isStepValid) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  const save = async () => {
    const isStepValid = await validateStep(step);
    if (!isStepValid) return;

    try {
      setSubmitError("");

      // Prepare the payload for just the current step
      const values = formik.values;

      const payload = {
        ...values,
        basics: {
          ...values.basics,
          targetRegions: Array.isArray(values.basics.targetRegions)
            ? values.basics.targetRegions.map((region) =>
                typeof region === "string" ? region : region.value
              )
            : [],
        },
        products: Array.isArray(values.products)
          ? values.products.map((p) => ({
              shopifyProductId: String(p.shopifyProductId || p._id || ""),
              handle: String(p.handle || ""),
              variantId: String(p.variantId || p.variants?.[0]?.id || ""),
              name: String(p.name || ""),
              description: String(p.description || ""),
              price: String(p.price || "0.00"),
              currency: String(p.currency || "USD"),
              image: String(p.image || ""),
            }))
          : [],
        creatorProfile: {
          ...values.creatorProfile,
        },
        goals: {
          ...values.goals,
          shippingRegions: Array.isArray(values.goals.shippingRegions)
            ? values.goals.shippingRegions.map((opt) =>
                typeof opt === "string" ? opt : opt.value
              )
            : [],
        },
      };
      Swal.fire({
        title: toastAlert("sure"),
        text: toastAlert("saveCmg"),
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: toastAlert("save"),
        cancelButtonText: toastAlert("cancel"),
        customClass: {
          confirmButton: "confirmButton",
          cancelButton: "cancelButton",
        },
      }).then(async (result) => {
        if (result.isConfirmed) {
          const resp = await api.put(
            `/campaign?campaignId=${campaignId}`,
            payload
          );

          // Assuming resp.data.data contains the updated campaign data
          const campaign = resp.campaign;

          if (!campaign) {
            throw new Error("Campaign data is missing in response");
          }

          // Initialize with defaults to prevent undefined errors
          const safeCampaign = {
            basics: campaign.basics || {},
            creatorProfile: campaign.creatorProfile || {},
            compensation: campaign.compensation || {},
            assets: campaign.assets || {},
            goals: campaign.goals || {},
            legal: campaign.legal || {},
            products: campaign.products || [],
          };

          // Map multi-select fields to { value, label } format
          const mapToSelectOptions = (values, options) => {
            if (!Array.isArray(values)) {
              return [];
            }
            return values.map((value) => {
              const cleanValue =
                typeof value === "string" ? value.replace(/"/g, "") : value;
              const option = options.find((opt) => opt.value === cleanValue);
              return option || { value: cleanValue, label: cleanValue };
            });
          };

          // Format the response data to match formik's expected structure
          const formattedCampaign = {
            ...formik.values, // Preserve other steps' data
            basics: {
              ...formik.values.basics,
              ...safeCampaign.basics,
              campaignType: safeCampaign.basics.campaignType || "public",
              category: safeCampaign.basics.category || "apparel",
              title: safeCampaign.basics.title || "",
              description: safeCampaign.basics.description || "",
              coverImages: safeCampaign.assets.logos || [],
              startDate: safeCampaign.basics.startDate
                ? new Date(safeCampaign.basics.startDate)
                    .toISOString()
                    .split("T")[0]
                : "",
              endDate: safeCampaign.basics.endDate
                ? new Date(safeCampaign.basics.endDate)
                    .toISOString()
                    .split("T")[0]
                : "",
              isOngoing: safeCampaign.basics.isOngoing ?? false,
              targetRegions: mapToSelectOptions(
                safeCampaign.basics.targetRegions || [],
                regionOptions
              ),
            },
            products: safeCampaign.products || [],
            creatorProfile: {
              ...formik.values.creatorProfile,
              ...safeCampaign.creatorProfile,
              contentRequirements:
                safeCampaign.creatorProfile.contentRequirements || "",
              requiresApproval:
                safeCampaign.creatorProfile.requiresApproval ?? false,
            },
            compensation: {
              ...formik.values.compensation,
              ...safeCampaign.compensation,
              type: safeCampaign.compensation.type || "",
              commission: safeCampaign.compensation.commission || "",
              amount: safeCampaign.compensation.amount || "",
              gifting: safeCampaign.compensation.gifting ?? false,
              duration: safeCampaign.compensation.duration || "",
              affiliateLinkDestination:
                safeCampaign.compensation.affiliateLinkDestination ||
                "https://",
            },
            assets: {
              ...formik.values.assets,
              ...safeCampaign.assets,
              logos: safeCampaign.basics.coverImages || [],
              photos: safeCampaign.assets.photos || [],
              videos: safeCampaign.assets.videos || [],
              examplePosts: safeCampaign.assets.examplePosts || [],
              styleGuide: {
                ...formik.values.assets.styleGuide,
                ...safeCampaign.assets.styleGuide,
                fonts: safeCampaign.assets.styleGuide?.fonts || "",
                colors: safeCampaign.assets.styleGuide?.colors || "",
                guidelines: safeCampaign.assets.styleGuide?.guidelines || "",
              },
            },
            goals: {
              ...formik.values.goals,
              ...safeCampaign.goals,
              clicks: safeCampaign.goals.clicks || "",
              sales: safeCampaign.goals.sales || "",
              signups: safeCampaign.goals.signups || "",
              budgetCap: safeCampaign.goals.budgetCap || "",
              products: safeCampaign.goals.products || [],
              shippingRegions: mapToSelectOptions(
                safeCampaign.goals.shippingRegions || [],
                regionOptions
              ),
              shippingRequirements:
                safeCampaign.goals.shippingRequirements || "",
            },
            legal: {
              ...formik.values.legal,
              ...safeCampaign.legal,

              ftcDisclosure: safeCampaign.legal.ftcDisclosure ?? true,
              customTerms: safeCampaign.legal.customTerms || "",
            },
          };
          // Update formik values with the formatted campaign data
          formik.setValues(formattedCampaign);

          Swal.fire({
            title: toastAlert("savedCmg"),
            position: "top-right",
            icon: "success",
            toast: true,
            showConfirmButton: false,
            timerProgressBar: false,
            timer: 5000,
          });
          router.push("/brand/campaign");
        }
      });
    } catch (error) {
      console.error("Save error:", error);
      Swal.fire({
        title: toastAlert("cmgFailed"),
        position: "top-right",
        icon: "error",
        toast: true,
        showConfirmButton: false,
        timerProgressBar: false,
        timer: 5000,
      });
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

      const mediaType = file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("video/")
        ? "video"
        : null;

      return {
        url: response.data.secure_url,
        publicId: response.data.public_id,
        ...(mediaType && { mediaType }),
      };
    } catch (error) {
      throw error;
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

  const renderStep = () => {
    const stepProps = {
      values: formik.values,
      errors: formik.errors,
      touched: formik.touched,
      handleChange: formik.handleChange,
      handleBlur: formik.handleBlur,
      setFieldValue: formik.setFieldValue,
      next,
    };

    switch (step) {
      case 0:
        return (
          <BasicsStep
            {...stepProps}
            regionOptions={regionOptions}
            handleFileUpload={handleFileUpload}
            uploading={uploading}
          />
        );
      case 1:
        return <ProductsStep {...stepProps} />;
      case 2:
        return <CompensationStep {...stepProps} />;
      case 3:
        return <ContentRequirementsStep {...stepProps} />;
      case 4:
        return (
          <CreativeAssetsStep
            {...stepProps}
            handleFileUpload={handleFileUpload}
            handleRemovePhoto={handleRemovePhoto}
            uploading={uploading}
            setUploading={setUploading}
          />
        );
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

  if (isLoading) {
    return (
      <div className="lg:max-w-3xl mx-auto px-5 lg:px-0 pb-7 bg-white rounded-lg">
        <Loader />
      </div>
    );
  }

  return (
    <div className="lg:max-w-3xl mx-auto px-5 lg:px-0 pb-7 bg-white rounded-lg">
      <div className="text-center my-6 lg:my-8">
        <h2 className="text-[24px] lg:text-[32px]">
          {isEditMode ? t("edit") : t("head")}
        </h2>
        <p className="text-base leading-[150%] tracking-[0%]">
          {isEditMode ? t("editHead") : t("para")}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full flex gap-0 items-center mt-[28px] mb-8 lg:mt-[48px]">
        {onboardSteps.map((i, index) => (
          <Fragment key={index}>
            <button
              type="button"
              disabled={!isEditMode}
              onClick={() => isEditMode && setStep(index)}
              className={`min-w-8 min-h-8 flex justify-center items-center rounded-full border ${
                i.step < step + 1
                  ? "bg-[#F2F2F2] border-[#F2F2F2] text-[#0c0d06]"
                  : i.step === step + 1
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-[#F2F2F2] border-[#0C0D0626] text-textColor"
              } ${
                isEditMode
                  ? "cursor-pointer hover:opacity-80"
                  : "cursor-default"
              }`}
            >
              {i.step < step + 1 ? <IconsLibrary name={"stepDone"} /> : i.step}
            </button>
            {i.step !== onboardSteps.length && (
              <span
                className={`block w-full h-[1px] bg-[#0C0D0626] ${
                  isEditMode ? "cursor-pointer" : ""
                }`}
                onClick={() => isEditMode && setStep(index)}
              />
            )}
          </Fragment>
        ))}
      </div>

      {/* Error message */}
      {submitError && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          {submitError}
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
        }}
        className=""
      >
        {renderStep()}
        {showCropper && imageToCrop && (
          <CropperComponent
            image={imageToCrop}
            onCropComplete={handleCropComplete}
            onCancel={() => {
              setShowCropper(false);
              setImageToCrop(null);
              setCurrentField("");
            }}
            isUploading={Boolean(currentField && uploading[currentField])}
          />
        )}
        {/* Navigation buttons */}
        <div className="flex justify-between pt-6">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              disabled={formik.isSubmitting}
            >
              {t("back")}
            </button>
          ) : (
            <Link
              href="/brand/campaign"
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              {t("cancel")}
            </Link>
          )}

          <div className="flex gap-2">
            {isEditMode && step < validationSchemas.length - 1 && (
              <button
                type="button"
                onClick={save}
                className="px-6 py-2 bg-[#f26915] text-white rounded-lg"
                disabled={formik.isSubmitting}
              >
                {t("save")}
              </button>
            )}
            {step < validationSchemas.length - 1 ? (
              <button
                type="button"
                onClick={next}
                className="px-6 py-2 bg-[#f26915] text-white rounded-lg"
                disabled={formik.isSubmitting}
              >
                {t("next")}
              </button>
            ) : (
              <button
                type="button"
                className="px-6 py-2 bg-[#f26915] text-white rounded-lg"
                disabled={formik.isSubmitting}
                onClick={(e) => {
                  e.preventDefault();
                  if (step === validationSchemas.length - 1) {
                    formik.handleSubmit();
                  }
                }}
              >
                {formik.isSubmitting
                  ? isEditMode
                    ? t("updating")
                    : t("creating")
                  : isEditMode
                  ? t("update")
                  : t("create")}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
