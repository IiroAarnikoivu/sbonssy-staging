"use client";
import InputNLabel, {
  RadioBtnNlabel,
  SelectOptionNlabel,
  TextareaNlabel,
  UploadFileNlabel,
} from "@/components/Common/InputNLabel/InputNLabel";
import CropperComponent from "@/components/Cropper";
import Sidebar from "@/components/Sidebar";
import api from "@/lib/axios";
import {
  checkOptions,
  companyInterest,
  uploadToCloudinary,
} from "@/lib/helper";
import { useAuthStore } from "@/store/authStore";
import { useFormik } from "formik";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import * as Yup from "yup";
import { configureYupLocale } from "@/lib/yupLocales";

const EditProfile = () => {
  const { user, setUser } = useAuthStore();
  const router = useRouter();
  const t = useTranslations("Brand.editProfile");
  const locale = useLocale();
  // Configure Yup with active locale for localized messages
  configureYupLocale(locale);

  const validationSchemaBrand = useMemo(
    () =>
      Yup.object().shape({
        companyName: Yup.string().required(),
        firstName: Yup.string().trim().required(),
        lastName: Yup.string().required(),
        legalName: Yup.string().required(),
        address: Yup.string().required(),
        vatNumber: Yup.string().required(),
        websiteUrl: Yup.string().url().required(),
        companyIntro: Yup.string().required(),
        companyInterest: Yup.array().max(5).required(),
        workingPeople: Yup.string().required(),
        companyLogo: Yup.string().required(),
      }),
    [locale]
  );

  // const radioData = ["Just me", "2-10", "11-50", "51-100", "101-500", "501+"];
  const radioData = [
    { value: "Just me", label: t("justMe") },
    { value: "2-10", label: "2-10" },
    { value: "11-50", label: "11 - 50" },
    { value: "51-100", label: "51-100" },
    { value: "101-500", label: "101-500" },
    { value: "501+", label: "501+" },
  ];

  const toastAlert = useTranslations("Sweetalert");
  const companyT = useTranslations("CompanyInterests");
  // Create options with English values and translated labels
  const companyInterestOptions = companyInterest.map((key) => ({
    value: key, // Keep original English key as value
    label: companyT(key), // Use translated version as label
  }));

  const formikBrand = useFormik({
    initialValues: {
      companyName: "",
      vatNumber: "",
      websiteUrl: "",
      legalName: "",
      address: "",
      firstName: "",
      lastName: "",
      companyIntro: "",
      companyInterest: [],
      workingPeople: checkOptions?.at(0) || radioData[0],
      companyLogo: "",
    },
    validationSchema: validationSchemaBrand,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        const body = {
          role: user?.onboardedDetails?.role,
          brand: {
            companyName: values.companyName,
            vatNumber: values.vatNumber,
            websiteUrl: values.websiteUrl,
            intro: values.companyIntro,
            firstName: values.firstName,
            lastName: values.lastName,
            legalName: values.legalName,
            address: values.address,
            // Extract just the English values for submission
            valuesAndInterests: values.companyInterest?.map(
              (val) => val?.value
            ),
            workingPeople: values.workingPeople,
            companyLogo: values.companyLogo,
          },
        };

        Swal.fire({
          title: toastAlert("sure"),
          text: toastAlert("savedMsg"),
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
            const resp = await api.put("/user", body);
            setUser({
              ...user,
              onboardedDetails: resp.data,
            });
            if (resp) {
              Swal.fire({
                title: toastAlert("profileUpdateSuccess"),
                position: "top-right",
                icon: "success",
                toast: true,
                showConfirmButton: false,
                timerProgressBar: false,
                timer: 4000,
              });
              router.push(`/brand`);
            }
          }
        });
      } catch (error) {
        console.error("Error updating profile:", error);
        Swal.fire({
          title: toastAlert("profileUpdateError"),
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
    if (user?.id) {
      (async () => {
        try {
          const response = await api.get(`/user?supabaseId=${user?.id}`);
          const profile = response.data;
          const brand = profile?.brand;

          // Map existing values to the option structure
          const mapToSelectOptions = (values, options) => {
            if (!Array.isArray(values)) return [];
            return values.map((value) => {
              const option = options.find((opt) => opt.value === value);
              return option || { value, label: value };
            });
          };

          formikBrand.setValues({
            companyName: brand?.companyName || "",
            firstName: brand?.firstName || "",
            lastName: brand?.lastName || "",
            vatNumber: brand?.vatNumber || "",
            websiteUrl: brand?.websiteUrl || "",
            companyIntro: brand?.intro || "",
            legalName: brand?.legalName || "",
            address: brand?.address || "",
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
  }, [user?.id, locale]);

  return (
    <div className="flex bg-gray-100 relative" >
      <div className="hidden lg:block h-fit lg:sticky top-0">
        <Sidebar />
      </div>
      <div className="flex-1 p-4 pt-8 md:p-6 md:pt-10">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-3xl font-semibold text-gray-900 mb-8">
              {t("heading")}
            </h2>
            <form onSubmit={formikBrand.handleSubmit}>
              <div className="space-y-6">
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
                  label={t("firstName")}
                  placeholder={t("firstName")}
                  name="firstName"
                  value={formikBrand.values.firstName}
                  onChange={formikBrand.handleChange}
                  onBlur={formikBrand.handleBlur}
                  error={
                    formikBrand.touched.firstName &&
                    formikBrand.errors.firstName
                      ? formikBrand.errors.firstName
                      : ""
                  }
                />
                <InputNLabel
                  inputType="text"
                  label={t("lastName")}
                  placeholder={t("lastName")}
                  name="lastName"
                  value={formikBrand.values.lastName}
                  onChange={formikBrand.handleChange}
                  onBlur={formikBrand.handleBlur}
                  error={
                    formikBrand.touched.lastName && formikBrand.errors.lastName
                      ? formikBrand.errors.lastName
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
                    formikBrand.touched.vatNumber &&
                    formikBrand.errors.vatNumber
                      ? formikBrand.errors.vatNumber
                      : ""
                  }
                />
                <InputNLabel
                  inputType="text"
                  label={t("nameLabel")}
                  placeholder={t("namePlaceholder")}
                  name="legalName"
                  value={formikBrand.values.legalName}
                  onChange={formikBrand.handleChange}
                  onBlur={formikBrand.handleBlur}
                  error={
                    formikBrand.touched.legalName &&
                    formikBrand.errors.legalName
                      ? formikBrand.errors.legalName
                      : ""
                  }
                />

                <TextareaNlabel
                  label={t("addressLabel")}
                  name="address"
                  value={formikBrand.values.address}
                  onChange={formikBrand.handleChange}
                  onBlur={formikBrand.handleBlur}
                  error={
                    formikBrand.touched.address && formikBrand.errors.address
                      ? formikBrand.errors.address
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
                    formikBrand.touched.websiteUrl &&
                    formikBrand.errors.websiteUrl
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
                  options={companyInterestOptions} // Ensure these are {value, label} objects
                  value={formikBrand.values.companyInterest}
                  onChange={(selectedOptions) => {
                    formikBrand.setFieldValue(
                      "companyInterest",
                      selectedOptions
                    );
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
                <div className="flex justify-end items-center gap-4 pt-6">
                  <button
                    type="button"
                    className="grayBtn"
                    onClick={() => router.push(`/brand`)}
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;
