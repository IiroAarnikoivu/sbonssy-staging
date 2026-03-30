"use client";
import { useFormik } from "formik";
import * as Yup from "yup";
import DefaultLayout from "@/components/Common/DefaultLayout.jsx/DefaultLayout";
import InputNLabel, {
  RadioBtnNlabel,
  SelectOptionNlabel,
  TextareaNlabel,
  UploadFileNlabel,
} from "@/components/Common/InputNLabel/InputNLabel";
import { useEffect, useState } from "react";
import {
  checkOptions,
  companyInterest,
  uploadToCloudinary,
} from "@/lib/helper";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import Swal from "sweetalert2";
import { useTranslations } from "next-intl";
import CropperComponent from "@/components/Cropper";

const validationSchemaBrand = Yup.object().shape({
  companyName: Yup.string().required("Brand name is required"),
  vatNumber: Yup.string().required("VAT number is required"),
  websiteUrl: Yup.string()
    .url("Must be a valid URL")
    .required("Website URL is required"),
  companyIntro: Yup.string().required("Company description is required"),
  companyInterest: Yup.array()
    .max(5, "Select maximum 5 interests")
    .required("Interests are required"),
  workingPeople: Yup.string().required("Company size is required"),
  companyLogo: Yup.string().required("Company logo is required"),
});

const BrandForm = ({ userId, onSuccess, isAdminEdit = false }) => {
  const { user, setUser } = useAuthStore();
  const router = useRouter();
  const t = useTranslations("Brand.editProfile");
  const toastAlert = useTranslations("Sweetalert");
  const companyT = useTranslations("CompanyInterests");
  const locale =
    typeof window !== "undefined" && window.localStorage.getItem("locale");

  const companyInterestOptions = companyInterest.map((key) => ({
    value: key,
    label: companyT(key),
  }));
  const radioData = [
    { value: "Just me", label: t("justMe") },
    { value: "2-10", label: "2-10" },
    { value: "11-50", label: "11 - 50" },
    { value: "51-100", label: "51-100" },
    { value: "101-500", label: "101-500" },
    { value: "501+", label: "501+" },
  ];

  const formikBrand = useFormik({
    initialValues: {
      companyName: "",
      vatNumber: "",
      websiteUrl: "",
      companyIntro: "",
      companyInterest: [],
      workingPeople: checkOptions?.at(0) || radioData[0],
      companyLogo: "",
    },
    validationSchema: validationSchemaBrand,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        const body = {
          role: "brand",
          isProfileCompleted: true,
          brand: {
            companyName: values.companyName,
            vatNumber: values.vatNumber,
            websiteUrl: values.websiteUrl,
            intro: values.companyIntro,
            valuesAndInterests: values.companyInterest?.map(
              (val) => val?.value
            ),
            workingPeople: values.workingPeople,
            companyLogo: values.companyLogo,
          },
        };

        if (isAdminEdit) {
          body.userId = userId;
        }
        const resp = await api.put("/admin/users", {
          userId: body.userId,
          formData: body,
        });

        if (resp) {
          if (onSuccess) {
            onSuccess(resp);
          } else {
            Swal.fire({
              title: toastAlert("profileUpdateThankYou"),
              position: "top-right",
              icon: "success",
              toast: true,
              showConfirmButton: false,
              timerProgressBar: false,
              timer: 3000,
            });

            const updatedOnboardedDetails = {
              ...user.onboardedDetails,
              ...resp.data,
              brand: {
                ...(user.onboardedDetails?.brand || {}),
                ...(resp.data.brand || {}),
              },
            };

            setUser({
              ...user,
              onboardedDetails: updatedOnboardedDetails,
            });
          }

          if (!isAdminEdit) {
            router.push(`/brand-profile/${user.id}`);
          }
        }
      } catch (error) {
        console.error("Error updating profile:", error);
        Swal.fire({
          title: toastAlert("errorUpdateProfile"),
          position: "top-right",
          icon: "error",
          toast: true,
          showConfirmButton: false,
          timerProgressBar: false,
          timer: 4000,
        });
      } finally {
        setSubmitting(false);
      }
    },
  });

  const [croppingImage, setCroppingImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      formikBrand.setFieldError("companyLogo", t("step2.invalidImage"));
      setUploadError(t("step2.invalidImage"));
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      formikBrand.setFieldError("companyLogo", t("step2.fileTooLarge"));
      setUploadError(t("step2.fileTooLarge"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCroppingImage(reader.result);
      setUploadError(null);
    };
    reader.onerror = () => {
      formikBrand.setFieldError("companyLogo", t("step2.readError"));
      setUploadError(t("step2.readError"));
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedFile) => {
    if (!croppedFile) {
      setCroppingImage(null);
      setUploadError(t("step2.noCroppedImage"));
      formikBrand.setFieldError("companyLogo", t("step2.noCroppedImage"));
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
        formikBrand.setFieldValue("companyLogo", uploadedUrl.url);
        formikBrand.setFieldTouched("companyLogo", true);
        setCroppingImage(null);
      } else {
        throw new Error(t("step2.noUrlReturned"));
      }
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadError(t("step2.uploadError"));
      formikBrand.setFieldError("companyLogo", t("step2.uploadError"));
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelCrop = () => {
    setCroppingImage(null);
    setUploadError(null);
    formikBrand.setFieldError("companyLogo", undefined);
    if (!formikBrand.values.companyLogo) {
      formikBrand.setFieldValue("companyLogo", "");
    }
  };

  useEffect(() => {
    if (userId) {
      (async () => {
        try {
          const response = await api.get(`/user?supabaseId=${userId}`);
          const profile = response.data;
          const brand = profile?.brand;

          const mapToSelectOptions = (values, options) => {
            if (!Array.isArray(values)) return [];
            return values.map((value) => {
              const option = options.find((opt) => opt.value === value);
              return option || { value, label: value };
            });
          };

          formikBrand.setValues({
            companyName: brand?.companyName || "",
            vatNumber: brand?.vatNumber || "",
            websiteUrl: brand?.websiteUrl || "",
            companyIntro: brand?.intro || "",
            companyInterest:
              mapToSelectOptions(
                brand?.valuesAndInterests,
                companyInterestOptions
              ) || [],
            workingPeople:
              brand?.workingPeople || checkOptions?.at(0) || radioData[0],
            companyLogo: brand?.companyLogo || "",
          });
        } catch (error) {
          console.error("Error fetching profile:", error);
        }
      })();
    }
  }, [userId, locale]);

  return (
    <div>
      <DefaultLayout styling="py-[64px] lg:py-[112px]">
        <h2 className="text-[36px] lg:text-[48px]">{t("heading")}</h2>
        <form onSubmit={formikBrand.handleSubmit}>
          <div className="flex flex-col gap-10 max-w-[560px] mt-10 lg:mt-20">
            <InputNLabel
              inputType="text"
              label={t("company")}
              placeholder={t("placeholder.one")}
              name="companyName"
              value={formikBrand.values.companyName}
              onChange={formikBrand.handleChange}
              onBlur={formikBrand.handleBlur}
              error={
                formikBrand.touched.companyName &&
                formikBrand.errors.companyName
                  ? formikBrand.errors.companyName
                  : ""
              }
            />
            <InputNLabel
              inputType="text"
              label={t("vat")}
              placeholder={t("placeholder.two")}
              name="vatNumber"
              value={formikBrand.values.vatNumber}
              onChange={formikBrand.handleChange}
              onBlur={formikBrand.handleBlur}
              error={
                formikBrand.touched.vatNumber && formikBrand.errors.vatNumber
                  ? formikBrand.errors.vatNumber
                  : ""
              }
            />
            <InputNLabel
              inputType="text"
              label={t("website")}
              placeholder={t("placeholder.three")}
              name="websiteUrl"
              value={formikBrand.values.websiteUrl}
              onChange={formikBrand.handleChange}
              onBlur={formikBrand.handleBlur}
              error={
                formikBrand.touched.websiteUrl && formikBrand.errors.websiteUrl
                  ? formikBrand.errors.websiteUrl
                  : ""
              }
            />
            <TextareaNlabel
              label={t("desc")}
              name="companyIntro"
              value={formikBrand.values.companyIntro}
              onChange={formikBrand.handleChange}
              onBlur={formikBrand.handleBlur}
              error={
                formikBrand.touched.companyIntro &&
                formikBrand.errors.companyIntro
                  ? formikBrand.errors.companyIntro
                  : ""
              }
            />
            <SelectOptionNlabel
              label={t("option")}
              name="companyInterest"
              options={companyInterestOptions}
              value={formikBrand.values.companyInterest}
              onChange={(selectedOptions) => {
                formikBrand.setFieldValue("companyInterest", selectedOptions);
              }}
              onBlur={formikBrand.handleBlur}
              error={
                formikBrand.touched.companyInterest &&
                formikBrand.errors.companyInterest
                  ? formikBrand.errors.companyInterest
                  : ""
              }
              isMulti
              closeMenuOnSelect={false}
              placeholder={t("placeholder.four")}
            />
            {croppingImage && (
              <CropperComponent
                image={croppingImage}
                onCropComplete={handleCropComplete}
                onCancel={handleCancelCrop}
              />
            )}
            <UploadFileNlabel
              label={t("logo")}
              name="companyLogo"
              onChange={handleFileChange}
              error={
                formikBrand.touched.companyLogo &&
                formikBrand.errors.companyLogo
                  ? formikBrand.errors.companyLogo
                  : ""
              }
              value={formikBrand.values.companyLogo}
            />
            <RadioBtnNlabel
              label={t("companySize")}
              name="workingPeople"
              data={radioData}
              value={formikBrand.values.workingPeople}
              onChange={formikBrand.handleChange}
              error={
                formikBrand.touched.workingPeople &&
                formikBrand.errors.workingPeople
                  ? formikBrand.errors.workingPeople
                  : ""
              }
            />
            <div className="flex justify-end items-center gap-4">
              <button
                type="button"
                className="grayBtn"
                onClick={() =>
                  isAdminEdit
                    ? router.push("/admin/users")
                    : router.push(`/brand-profile/${user.id}`)
                }
              >
                {t("cancel")}
              </button>
              <button
                type="submit"
                className="primaryBtn"
                disabled={formikBrand.isSubmitting}
              >
                {formikBrand.isSubmitting ? t("saving") : t("save")}
              </button>
            </div>
          </div>
        </form>
      </DefaultLayout>
    </div>
  );
};

export default BrandForm;
