"use client";

import { useFormik } from "formik";
import React, { use, useEffect, useState, useMemo } from "react";
import * as Yup from "yup";
import BasicInfo from "@/components/BasicInfo";
import Details from "@/components/Details";
import OnboardingImages from "@/components/OnboardingImages";
import SocialLogins from "@/components/SocialLogins";
import BrandForm from "@/components/BrandForm";
import { checkOptions, uploadToCloudinary, verifyToken } from "@/lib/helper";
import {
  deleteFromSupabase,
  extractFilePathFromUrl,
} from "@/lib/supabase/storage";
import api from "@/lib/axios";
import { useRouter } from "next/navigation";
import BrandInfo from "@/components/BrandInfo";
import BrandDetails from "@/components/BrandDetails";
import BrandLast from "@/components/BrandLast";
import StepsProgress from "@/components/Onboarding/StepsProgress";
import { useAuthStore } from "@/store/authStore";
import Swal from "sweetalert2";
import { useTranslations, useLocale } from "next-intl";
import { configureYupLocale } from "@/lib/yupLocales";
import NonBrandForm from "@/components/Onboarding/NonBrandForm";

/**
 * Onboarding page for multiple roles with step-based forms.
 * @param {Object} props
 * @param {{role: string}} props.params
 */
export default function RoleFormPage({ params }) {
  const resolvedParams = use(params); // Unwrap the Promise
  const role = resolvedParams.role; // Access the property safely
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const { shopify_token } = user?.onboardedDetails ?? "";
  const [currentStep, setCurrentStep] = useState(0);
  const [currentStepBrand, setCurrentStepBrand] = useState(0);
  const toastAlert = useTranslations("Sweetalert");
  const validation = useTranslations("Validation");
  const locale = useLocale();

  // Ensure Yup uses the active locale (en/fi) before building schemas
  configureYupLocale(locale);

  // Rebuild schemas when locale changes so messages come from yupLocales
  const memoValidationSchema = useMemo(
    () =>
      Yup.object().shape({
        firstName: Yup.string().required(validation("firstNameRequired")),
        lastName: Yup.string().required(validation("lastNameRequired")),
        address: Yup.string().required(validation("addressRequired")),
        companyNumber: Yup.string().when("subRole", {
          is: "team",
          then: (schema) => schema.required(validation("companyNumberRequired")),
          otherwise: (schema) => schema.optional(),
        }),
        taxNumber: Yup.string().when("subRole", {
          is: "team",
          then: (schema) => schema.optional(),
          otherwise: (schema) => schema.required(validation("taxNumberRequired")),
        }),
        gender: Yup.string().when("subRole", {
          is: "team",
          then: (schema) => schema.optional(),
          otherwise: (schema) => schema.required(validation("genderRequired")),
        }),
        sports: Yup.array()
          .of(Yup.string())
          .when("subRole", {
            is: "influencer",
            then: (schema) => schema.optional(),
            otherwise: (schema) =>
              schema.min(1, validation("sportsMin")).required(validation("sportsMin")),
          }),
        level: Yup.string().when("subRole", {
          is: (value) => value === "influencer" || value === "ex-athlete",
          then: (schema) => schema.optional(),
          otherwise: (schema) => schema.required(validation("levelRequired")),
        }),
        teamName: Yup.string().when("subRole", {
          is: "team",
          then: (schema) => schema.required(validation("teamNameRequired")),
          otherwise: (schema) => schema.optional(),
        }),
        location: Yup.object()
          .shape({
            type: Yup.string().required().oneOf(["Point"]),
            coordinates: Yup.array().of(Yup.number().required()).length(2).required(),
            locationName: Yup.string().required(validation("locationNameRequired")),
          })
          .required(validation("locationRequired")),
        biography: Yup.string().required(validation("biographyRequired")).max(500),
        achievements: Yup.string().max(500),
        records: Yup.string().max(500),
        goals: Yup.string().max(500),
        interests: Yup.array().of(Yup.string()).min(1, validation("interestsMin")).required(validation("interestsMin")),
        subRole: Yup.string().required(validation("subRoleRequired")),
        onboardPhotos: Yup.array().min(1, validation("imageRequired")).required(validation("imageRequired")),
        termsAccepted: Yup.boolean()
          .oneOf([true], validation("termsAcceptedRequired"))
          .required(validation("termsAcceptedRequired")),
        socialLogins: Yup.object().shape({
          instagram: Yup.string().url(validation("invalidInstagramUrl")).nullable().notRequired(),
          facebook: Yup.string().url(validation("invalidFacebookUrl")).nullable().notRequired(),
          tikTok: Yup.string().url(validation("invalidTikTokUrl")).nullable().notRequired(),
          youTube: Yup.string().url(validation("invalidYouTubeUrl")).nullable().notRequired(),
          x: Yup.string().url(validation("invalidXUrl")).nullable().notRequired(),
          website: Yup.string().url(validation("invalidWebsiteUrl")).nullable().notRequired(),
          linkedin: Yup.string().url(validation("invalidLinkedInUrl")).nullable().notRequired(),
        }),
      }),
    [locale, validation]
  );

  const memoValidationSchemaBrand = useMemo(
    () =>
      Yup.object().shape({
        firstName: Yup.string().required(validation("firstNameRequired")),
        lastName: Yup.string().required(validation("lastNameRequired")),
        companyName: Yup.string().required(validation("companyNameRequired")),
        jobTitle: Yup.string().required(validation("jobTitleRequired")),
        vatNumber: Yup.string().required(validation("vatNumberRequired")),
        legalName: Yup.string().required(validation("legalNameRequired")),
        address: Yup.string().required(validation("addressRequired")),
        references: Yup.string().required(validation("referencesRequired")),
        companyInterest: Yup.array()
          .max(5, validation("companyInterestMax"))
          .min(1, validation("companyInterestMin"))
          .required(validation("companyInterestRequired")),
        companyIntro: Yup.string().required(validation("companyIntroRequired")),
        websiteUrl: Yup.string()
          .url(validation("websiteUrlInvalid"))
          .required(validation("websiteUrlRequired")),
        workingPeople: Yup.string().required(validation("workingPeopleRequired")),
        companyLogo: Yup.string().required(validation("companyLogoRequired")),
      }),
    [locale, validation]
  );

  const formik = useFormik({
    initialValues: {
      subRole: "",
      firstName: "",
      lastName: "",
      address: "",
      gender: "",
      sports: [],
      level: "",
      teamName: "",
      companyNumber: "",
      taxNumber: "",
      // location: "",
      location: {
        type: "Point",
        coordinates: [0, 0],
        locationName: "",
      },
      biography: "",
      achievements: "",
      records: "",
      goals: "",
      interests: [],
      socialLogins: {
        instagram: "",
        facebook: "",
        tikTok: "",
        youTube: "",
        x: "",
        website: "",
        linkedin: "",
      },
      selectedRole: role,
      onboardPhotos: [],
      termsAccepted: false,
    },
    validationSchema: memoValidationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      const body = {
        role: decodeURIComponent(role),
        onBoarding: true,
        subRole: values.subRole,
        athlete: values.subRole === "athlete" && {
          name: values.firstName + " " + values.lastName,
          address: values.address,
          gender: values.gender.toLowerCase(), // Normalize to lowercase
          sports: values.sports,
          level: values.level,
          teamClubName: values.teamName,
          interests: values.interests,
          location: values.location,
          taxNumber: values.taxNumber,
          images: values.onboardPhotos,
          biography: values.biography,
          achievements: values.achievements,
          records: values.records,
          goals: values.goals,
          socialMedia: {
            instagram: values.socialLogins.instagram,
            facebook: values.socialLogins.facebook,
            tiktok: values.socialLogins.tikTok,
            youtube: values.socialLogins.youTube,
            twitter: values.socialLogins.x,
            website: values.socialLogins.website,
            linkedin: values.socialLogins.linkedin,
          },
        },
        team: values.subRole === "team" && {
          name: values.firstName + " " + values.lastName,
          sports: values.sports,
          level: values.level,
          address: values.address,
          teamClubName: values.teamName,
          interests: values.interests,
          location: values.location,
          companyNumber: values.companyNumber,
          images: values.onboardPhotos,
          biography: values.biography,
          achievements: values.achievements,
          records: values.records,
          goals: values.goals,
          socialMedia: {
            instagram: values.socialLogins.instagram,
            facebook: values.socialLogins.facebook,
            tiktok: values.socialLogins.tikTok,
            youtube: values.socialLogins.youTube,
            twitter: values.socialLogins.x,
            website: values.socialLogins.website,
            linkedin: values.socialLogins.linkedin,
          },
        },
        influencer: values.subRole === "influencer" && {
          name: values.firstName + " " + values.lastName,
          gender: values.gender,
          sports: values.sports,
          interests: values.interests,
          location: values.location,
          taxNumber: values.taxNumber,
          images: values.onboardPhotos,
          biography: values.biography,
          achievements: values.achievements,
          records: values.records,
          goals: values.goals,
          socialMedia: {
            instagram: values.socialLogins.instagram,
            facebook: values.socialLogins.facebook,
            tiktok: values.socialLogins.tikTok,
            youtube: values.socialLogins.youTube,
            twitter: values.socialLogins.x,
            website: values.socialLogins.website,
            linkedin: values.socialLogins.linkedin,
          },
        },
        coach: values.subRole === "coach" && {
          name: values.firstName + " " + values.lastName,
          gender: values.gender.toLowerCase(), // Normalize to lowercase
          sports: values.sports,
          address: values.address,
          level: values.level,
          taxNumber: values.taxNumber,
          teamClubName: values.teamName,
          interests: values.interests,
          location: values.location,
          images: values.onboardPhotos,
          biography: values.biography,
          achievements: values.achievements,
          records: values.records,
          goals: values.goals,
          socialMedia: {
            instagram: values.socialLogins.instagram,
            facebook: values.socialLogins.facebook,
            tiktok: values.socialLogins.tikTok,
            youtube: values.socialLogins.youTube,
            twitter: values.socialLogins.x,
            website: values.socialLogins.website,
            linkedin: values.socialLogins.linkedin,
          },
        },
        exAthlete: values.subRole === "ex-athlete" && {
          name: values.firstName + " " + values.lastName,
          gender: values.gender.toLowerCase(), // Normalize to lowercase
          sports: values.sports,
          address: values.address,
          level: values.level,
          teamClubName: values.teamName,
          interests: values.interests,
          taxNumber: values.taxNumber,
          location: values.location,
          images: values.onboardPhotos,
          biography: values.biography,
          achievements: values.achievements,
          records: values.records,
          goals: values.goals,
          socialMedia: {
            instagram: values.socialLogins.instagram,
            facebook: values.socialLogins.facebook,
            tiktok: values.socialLogins.tikTok,
            youtube: values.socialLogins.youTube,
            twitter: values.socialLogins.x,
            website: values.socialLogins.website,
            linkedin: values.socialLogins.linkedin,
          },
        },
        paraAthlete: values.subRole === "para-athlete" && {
          name: values.firstName + " " + values.lastName,
          gender: values.gender.toLowerCase(), // Normalize to lowercase
          sports: values.sports,
          level: values.level,
          address: values.address,
          teamClubName: values.teamName,
          interests: values.interests,
          location: values.location,
          taxNumber: values.taxNumber,
          images: values.onboardPhotos,
          biography: values.biography,
          achievements: values.achievements,
          records: values.records,
          goals: values.goals,
          socialMedia: {
            instagram: values.socialLogins.instagram,
            facebook: values.socialLogins.facebook,
            tiktok: values.socialLogins.tikTok,
            youtube: values.socialLogins.youTube,
            twitter: values.socialLogins.x,
            website: values.socialLogins.website,
            linkedin: values.socialLogins.linkedin,
          },
        },
      };

      const resp = await api.put("/user", body);
      if (resp) {
        Swal.fire({
          toast: true,
          position: "top-right",
          title: toastAlert("profileUpdateThankYou"),
          icon: "success",
          showConfirmButton: false,
          timerProgressBar: false,
          timer: 5000,
        });

        setUser({
          ...user,
          onboardedDetails: resp.data,
        });

        // Create Stripe customer for sports-ambassador
        // const customerBody = {
        //   userId: resp.data?._id,
        //   email: resp.data?.email,
        // };
        // const customerResult = await api.post("/payments/create-customer", customerBody);

        // if (customerResult?.data?.success) {
        //   // Refresh user data to get the updated Stripe customer ID
        //   const updatedUserResponse = await api.get(`/user?supabaseId=${resp.data.supabaseId}`);
        //   if (updatedUserResponse?.data) {
        //     setUser({
        //       ...user,
        //       onboardedDetails: updatedUserResponse.data,
        //     });
        //     console.log("Sports-ambassador user updated with Stripe customer ID after onboarding");
        //   }
        // }
        //   }
        // }
      }

      // setSubmitting(false); // Removed to prevent state flickering before redirect

      const targetPath = role === "brand" ? "/brand" : `/${role}`;
      router.push(targetPath);
    },
  });

  // Reset form when subRole changes to avoid stale validation errors
  useEffect(() => {
    formik.resetForm({
      values: {
        ...formik.initialValues,
        subRole: formik.values.subRole,
        name: formik.values.name,
        location: formik.values.location,
      },
      touched: {},
      errors: {},
    });
  }, [formik.values.subRole]);

  // Render steps for non-brand flow
  const renderStep = (step) => {
    switch (step) {
      case 0:
        return (
          <BasicInfo
            formik={formik}
            handleRoleChange={handleRoleChange}
            next={next}
          />
        );
      case 1:
        return <Details formik={formik} next={next} prev={prev} />;
      case 2:
        return (
          <OnboardingImages
            formik={formik}
            handleAthletePhotos={handleAthletePhotos}
            handleRemoveAthletePhoto={handleRemoveAthletePhoto}
            next={next}
            prev={prev}
          />
        );
      case 3:
        return <SocialLogins formik={formik} prev={prev} />;
      default:
        return null;
    }
  };

  const validateStep = async (step) => {
    await formik.validateForm(); // Triggers validation

    // Define which fields to check per step
    const stepFields = {
      0: () => {
        const fields = ["name", "subRole"];
        // Add base personal info validations per role
        if (formik.values.subRole !== "team") {
          // Non-team roles require taxNumber
          fields.push("firstName", "lastName", "address", "taxNumber");
        } else {
          // Team role requires companyNumber instead of taxNumber
          fields.push("firstName", "lastName", "address", "companyNumber");
        }
        if (!formik.values.location?.locationName) {
          formik.setFieldTouched("location.locationName", true);
          return [...fields, "location"];
        }
        if (formik.values.subRole !== "team") fields.push("gender");
        if (formik.values.subRole !== "influencer") {
          fields.push("sports", "teamName");
          if (formik.values.subRole !== "ex-athlete") {
            fields.push("level");
          }
        }
        return fields;
      },
      1: () => ["biography", "achievements", "goals", "interests", "records"],
      2: () => ["onboardPhotos"],
      3: () => ["termsAccepted"],
    };

    const fields = stepFields[step] ? stepFields[step]() : [];
    const errors = await formik.validateForm(); // Fresh error check

    const stepErrors = fields.filter((field) => !!errors[field]);

    if (stepErrors?.length > 0) {
      const touched = fields.reduce((acc, field) => {
        acc[field] = true;
        return acc;
      }, {});
      formik.setTouched(touched);
      return false;
    }

    return true;
  };

  const next = async () => {
    const isStepValid = await validateStep(currentStep);

    if (isStepValid) {
      setCurrentStep(currentStep + 1);
      // Scroll to top on mobile when moving to next step
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      formik.setTouched({
        name: true,
        subRole: true,
        gender: true,
        sport: true,
        level: true,
        teamName: true,
        location: true,
      });
    }
  };

  const prev = () => {
    setCurrentStep(currentStep - 1);
    // Scroll to top on mobile when moving to previous step
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRoleChange = (e) => {
    const newRole = e.target.value;

    // Reset step to 0 if changing role from step 1
    if (currentStep === 1) {
      setCurrentStep(0);
    }

    // Update subRole and reset form state
    formik.setFieldValue("subRole", newRole);

    // Scroll to top on mobile when role changes
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAthletePhotos = (e) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files);
      const existingPhotos = formik.values.onboardPhotos || [];

      const uploadPromises = fileArray.map((file, index) =>
        uploadToCloudinary({
          file,
          folder: "onboarding_photos",
        }).then((uploaded) => {
          return {
            ...uploaded,
            isProfile: existingPhotos.length === 0 && index === 0,
          };
        })
      );

      Promise.all(uploadPromises).then((uploadedUrls) => {
        const updatedPhotos = [...existingPhotos, ...uploadedUrls];
        formik.setFieldValue("onboardPhotos", updatedPhotos);
      });
    }
  };

  const handleRemoveAthletePhoto = async (index) => {
    const photo = formik.values.onboardPhotos[index];
    // await cloudinary.uploader.destroy(photo.publicId);

    const updatedPhotos = [...formik.values.onboardPhotos];
    updatedPhotos.splice(index, 1);

    formik.setFieldValue("onboardPhotos", updatedPhotos);
  };

  //  Brand
  const formikBrand = useFormik({
    initialValues: {
      firstName: "",
      lastName: "",
      jobTitle: "",
      legalName: "",
      address: "",
      companyName: "",
      vatNumber: "",
      references: "",
      companyInterest: [],
      companyIntro: "",
      websiteUrl: "https://",
      workingPeople: checkOptions?.at(0),
      companyLogo: "",
      termsAccepted: false,
    },
    validationSchema: memoValidationSchemaBrand,
    onSubmit: async (values, { setSubmitting }) => {
      const body = {
        role: decodeURIComponent(role),
        onBoarding: true,
        brand: {
          firstName: values.firstName,
          lastName: values.lastName,
          currentJobTitle: values.jobTitle,
          companyName: values.companyName,
          vatNumber: values.vatNumber,
          legalName: values.legalName,
          address: values.address,
          websiteUrl: values.websiteUrl,
          intro: values.companyIntro,
          valuesAndInterests: values.companyInterest,
          companyLogo: values.companyLogo,
          workingPeople: values.workingPeople,
          howDidYouHear: values.references,
        },
      };

      const resp = await api.put("/user", { ...body });
      if (resp) {
        Swal.fire({
          toast: true,
          position: "top-right",
          title: toastAlert("profileUpdateThankYou"),
          icon: "success",
          showConfirmButton: false,
          timerProgressBar: false,
          timer: 5000,
        });

        setUser({
          ...user,
          onboardedDetails: resp.data,
        });
        const body = {
          userId: resp.data?._id,
          email: resp.data?.email,
        };
        const customerResult = await api.post(
          "/payments/create-customer",
          body
        );

        if (customerResult?.data?.success) {
          // Refresh user data to get the updated Stripe customer ID
          const updatedUserResponse = await api.get(
            `/user?supabaseId=${resp.data.supabaseId}`
          );
          if (updatedUserResponse?.data) {
            setUser({
              ...user,
              onboardedDetails: updatedUserResponse.data,
            });
          }
        }
      }

      // setSubmitting(false); // Removed to prevent state flickering before redirect
      const userRole = resp?.data?.data?.role || role;
      console.log("userRole", userRole);
      const targetUrl = userRole === "brand" ? "/brand" : `/${userRole}`;
      router.push(targetUrl);
    },
  });

  const renderStepBrand = (step) => {
    switch (step) {
      case 0:
        return <BrandInfo formik={formikBrand} next={nextBrand} />;
      case 1:
        return (
          <BrandDetails
            formik={formikBrand}
            handleCompanyLogo={handleCompanyLogo}
            handleRemoveCompanyLogo={handleRemoveCompanyLogo}
            next={nextBrand}
            prev={prevBrand}
          />
        );
      case 2:
        return <BrandLast formik={formikBrand} prev={prevBrand} />;
      default:
        return null;
    }
  };

  const validateStepBrand = async (step) => {
    const fieldsToValidate = {
      0: [
        "firstName",
        "lastName",
        "jobTitle",
        "companyName",
        "companyIntro",
        "vatNumber",
        "websiteUrl",
      ],
      1: ["companyInterest", "workingPeople", "companyLogo"],
      2: ["references"],
    };

    const fields = fieldsToValidate[step] || [];
    const errors = await formikBrand.validateForm();

    // Check if any of the current step's fields have errors
    const hasErrors = fields.some((field) => errors[field]);

    if (hasErrors) {
      return false;
    }

    return true;
  };

  const nextBrand = async () => {
    const isStepValid = await validateStepBrand(currentStepBrand);
    if (!isStepValid) {
      // Force validation messages to show
      const fieldsToValidate = {
        0: [
          "firstName",
          "lastName",
          "jobTitle",
          "companyName",
          "companyIntro",
          "vatNumber",
          "websiteUrl",
        ],
        1: ["companyInterest", "workingPeople", "companyLogo"],
        2: ["references", "termsAccepted"],
      };

      const fields = fieldsToValidate[currentStepBrand] || [];
      const touchedFields = fields.reduce((acc, field) => {
        acc[field] = true;
        return acc;
      }, {});
      formikBrand.setTouched(touchedFields);
      return;
    }
    setCurrentStepBrand((prev) => prev + 1);
    // Scroll to top on mobile when moving to next step
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const prevBrand = () => {
    setCurrentStepBrand(currentStepBrand - 1);
    // Scroll to top on mobile when moving to previous step
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCompanyLogo = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadToCloudinary({ file, folder: "brand_logo" }).then((uploadedUrl) => {
        if (uploadedUrl?.url) {
          formikBrand.setFieldValue("companyLogo", uploadedUrl.url);
        }
      });
    }
  };
  const handleRemoveCompanyLogo = async () => {
    const logoUrl = formikBrand.values.companyLogo;
    if (logoUrl) {
      try {
        // Extract file path from the Supabase URL and delete from storage
        const filePath = extractFilePathFromUrl(logoUrl);
        if (filePath) {
          const deleteResult = await deleteFromSupabase({
            filePath,
            bucket: "sbonssy",
          });

          if (deleteResult.error) {
            console.error(
              "Error deleting file from Supabase:",
              deleteResult.error
            );
            // Still clear the field even if deletion fails
          } else {
            console.log("File successfully deleted from Supabase storage");
          }
        }

        // Clear the companyLogo field in Formik
        formikBrand.setFieldValue("companyLogo", "");
      } catch (error) {
        console.error("Error removing logo from Supabase:", error);
        // Optionally, notify the user but still clear the field
        formikBrand.setFieldValue("companyLogo", "");
      }
    }
  };
  const steps = role === "brand" ? onboardStepsBrand : onboardSteps;
  const isBrand = role === "brand";
  const currentIndex = isBrand ? currentStepBrand : currentStep;

  return (
    <div className="lg:w-[560px] mx-auto px-5 lg:px-0 pt-24 lg:pt-28 min-h-[calc(100vh-210px)]">
      <StepsProgress steps={steps} currentIndex={currentIndex} />
      {/* <div className="w-full flex gap-0 items-center mt-[28px] mb-8 lg:mt-[48px]">
        {steps.map((i, index) => {
          return (
            <React.Fragment key={index}>
              <div className="min-w-8 min-h-8 justify-center items-center flex rounded-full border border-[#0C0D0626] bg-[#F2F2F2] text-textColor">
                {currentStep == i.step ? (
                  <IconsLibrary name={"stepDone"} />
                ) : (
                  i.step
                )}
              </div>
              <span className="block w-full h-[1px] bg-[#0C0D0626] last:hidden" />
            </React.Fragment>
          );
        })}
      </div> */}
      {role === "brand" ? (
        <BrandForm
          formik={formikBrand}
          renderStep={renderStepBrand}
          currentStep={currentStepBrand}
        />
      ) : (
        <NonBrandForm
          formik={formik}
          renderStep={renderStep}
          currentStep={currentStep}
        />
      )}
    </div>
  );
}
const onboardStepsBrand = [{ step: 1 }, { step: 2 }, { step: 3 }];
const onboardSteps = [
  {
    step: 1,
  },

  {
    step: 2,
  },

  {
    step: 3,
  },

  {
    step: 4,
  },
];
