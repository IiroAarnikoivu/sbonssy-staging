"use client";
import { useFormik } from "formik";
import * as Yup from "yup";
import DefaultLayout from "@/components/Common/DefaultLayout.jsx/DefaultLayout";
import InputNLabel, {
  TextareaNlabel,
  SelectOptionNlabel,
  SelectOptionNlabelAndValue,
} from "@/components/Common/InputNLabel/InputNLabel";
import React, { useEffect, useMemo } from "react";
import { sports, toCamelCase } from "@/lib/helper";
import IconsLibrary from "@/util/IconsLibrary";
import dynamic from "next/dynamic";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import Swal from "sweetalert2";
import { useTranslations, useLocale } from "next-intl";
import useTranslatedInterests from "@/hook/useInterestTranslations";
import { configureYupLocale } from "@/lib/yupLocales";

// Define levels to match validation requirements
const levels = ["Olympic", "Professional", "Semi-Pro", "Amateur", "Junior"];

export default function Page() {
  const { user, setUser } = useAuthStore();
  const subRole = toCamelCase(user?.onboardedDetails?.subRole);
  const router = useRouter();
  const t = useTranslations("Sports.edit");
  const sportsT = useTranslations("SportsOptions.sports");
  const levelT = useTranslations("Levels");
  const toastAlert = useTranslations("Sweetalert");
  const subrole = toCamelCase(user?.onboardedDetails?.subRole);
  const locale = useLocale();
  // Configure Yup with active locale and build schema after locale is known
  configureYupLocale(locale);

  const validationSchema = useMemo(
    () =>
      Yup.object().shape({
        name: Yup.string().required(),
        companyNumber: Yup.string().when("subRole", {
          is: "team",
          then: (schema) => schema.required(),
          otherwise: (schema) => schema.optional(),
        }),
        taxNumber: Yup.string().when("subRole", {
          is: "team",
          then: (schema) => schema.optional(),
          otherwise: (schema) => schema.required(),
        }),
        address: Yup.string().required(),
        gender: Yup.string().when("subRole", {
          is: "team",
          then: (schema) => schema.optional(),
          otherwise: (schema) => schema.required(),
        }),
        sports: Yup.array()
          .of(Yup.string())
          .when("subRole", {
            is: "influencer",
            then: (schema) => schema.optional(),
            otherwise: (schema) => schema.min(1).required(),
          }),
        level: Yup.string().when("subRole", {
          is: "influencer",
          then: (schema) => schema.optional(),
          otherwise: (schema) => schema.required(),
        }),
        teamName: Yup.string().when("subRole", {
          is: "team",
          then: (schema) => schema.required(),
          otherwise: (schema) => schema.optional(),
        }),
        location: Yup.object()
          .shape({
            type: Yup.string().required().oneOf(["Point"]),
            coordinates: Yup.array()
              .of(Yup.number().required())
              .length(2)
              .required(),
            locationName: Yup.string().required(),
          })
          .required(),
        biography: Yup.string().required().max(500),
        achievements: Yup.string(),
        records: Yup.string(),
        goals: Yup.string(),
        interests: Yup.array().of(Yup.string()).min(1).required(),
        subRole: Yup.string().required(),
        onboardPhotos: Yup.array().min(1).required(),
        socialLogins: Yup.object().shape({
          instagram: Yup.string().url().nullable().notRequired(),
          facebook: Yup.string().url().nullable().notRequired(),
          tikTok: Yup.string().url().nullable().notRequired(),
          youTube: Yup.string().url().nullable().notRequired(),
          x: Yup.string().url().nullable().notRequired(),
          website: Yup.string().url().nullable().notRequired(),
          linkedin: Yup.string().url().nullable().notRequired(),
        }),
      }),
    [locale]
  );

  // Use the interest hook
  const translatedInterestOptions = useTranslatedInterests();

  // Translate sports directly in component
  const sportsOptions = sports.map((sport) => ({
    label: sportsT(sport) || sport,
    value: sport,
  }));

  // Translate levels directly in component
  const translatedLevels = levels.map((level) => ({
    value: level,
    label: levelT(level) || level,
  }));

  const formik = useFormik({
    initialValues: {
      subRole: "",
      name: "",
      gender: "",
      sports: [],
      level: "",
      companyNumber: "",
      taxNumber: "",
      address: "",
      teamName: "",
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
      selectedRole: "sports-ambassador",
      onboardPhotos: [],
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      const body = {
        role: "sports-ambassador",
        subRole: values.subRole,
        athlete: values.subRole === "athlete" && {
          name: values.name,
          address: values.address,
          taxNumber: values.taxNumber,
          gender: values.gender.toLowerCase(),
          sports: values.sports,
          level: values.level,
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
        team: values.subRole === "team" && {
          name: values.name,
          sports: values.sports,
          level: values.level,
          teamClubName: values.teamName,
          address: values.address,
          companyNumber: values.companyNumber,
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
        influencer: values.subRole === "influencer" && {
          name: values.name,
          gender: values.gender,
          interests: values.interests,
          location: values.location,
          address: values.address,
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
          name: values.name,
          gender: values.gender.toLowerCase(),
          sports: values.sports,
          address: values.address,
          taxNumber: values.taxNumber,
          level: values.level,
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
          name: values.name,
          gender: values.gender.toLowerCase(),
          sports: values.sports,
          level: values.level,
          teamClubName: values.teamName,
          interests: values.interests,
          address: values.address,
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
          name: values.name,
          gender: values.gender.toLowerCase(),
          sports: values.sports,
          level: values.level,
          teamClubName: values.teamName,
          address: values.address,
          taxNumber: values.taxNumber,
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
      };
      Swal.fire({
        title: toastAlert("sure"),
        text: toastAlert("saveChangeText"),
        icon: "info",
        showCancelButton: true,
        confirmButtonText: toastAlert("save"),
        cancelButtonText: toastAlert("cancel"),
        customClass: {
          confirmButton: "confirmButton",
          cancelButton: "cancelButton",
        },
      }).then(async (result) => {
        /* Read more about isConfirmed, isDenied below */
        if (result.isConfirmed) {
          const resp = await api.put("/user", body);
          if (resp) {
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
              ...(resp.data.subRole && {
                [resp.data.subRole]: {
                  ...(user.onboardedDetails?.[resp.data.subRole] || {}),
                  ...(resp.data[resp.data.subRole] || {}),
                },
              }),
            };

            setUser({
              ...user,
              onboardedDetails: updatedOnboardedDetails,
            });

            setSubmitting(false);
          }
          router.push(`/sports-ambassador-profile/${subRole}/${user?.id}`);
        }
      });
    },
  });

  useEffect(() => {
    if (user?.id) {
      (async () => {
        try {
          const response = await api.get(
            `/user?supabaseId=${user?.onboardedDetails?.invitedBy
              ? user?.onboardedDetails?.invitedBy?.supabaseId
              : user?.id
            }`
          );

          const profile = response.data;
          const sub_role = profile?.[subrole];

          formik.setValues({
            subRole: profile.subRole || "",
            name: sub_role?.name || "",
            gender: sub_role?.gender || "",
            interests: sub_role?.interests || [],
            location: sub_role?.location || {
              type: "Point",
              coordinates: [0, 0],
              locationName: "",
            },
            biography: sub_role?.biography || "",
            achievements: sub_role?.achievements || "",
            records: sub_role?.records || "",
            goals: sub_role?.goals || "",
            sports: sub_role?.sports || [], // Ensure sports is always an array
            level: sub_role?.level || "",
            address: sub_role?.address || "",
            taxNumber: sub_role?.taxNumber || "",
            companyNumber: sub_role?.companyNumber || "",
            teamName: sub_role?.teamClubName || "",
            onboardPhotos: sub_role?.images || [],
            socialLogins: {
              instagram: sub_role?.socialMedia?.instagram || "",
              facebook: sub_role?.socialMedia?.facebook || "",
              tikTok: sub_role?.socialMedia?.tiktok || "",
              youTube: sub_role?.socialMedia?.youtube || "",
              x: sub_role?.socialMedia?.twitter || "",
              website: sub_role?.socialMedia?.website || "",
              linkedin: sub_role?.socialMedia?.linkedin || "",
            },
          });
        } catch (error) {
          console.error("Failed to fetch user data:", error);
        }
      })();
    }
  }, [user?.id, subrole]);

  return (
    <div>
      <DefaultLayout styling="py-8">
        <form
          onSubmit={formik.handleSubmit}
          className="flex flex-col gap-10 max-w-[560px] mx-auto"
        >
          {/* Sport */}
          {formik?.values?.subRole !== "influencer" && (
            <SelectOptionNlabelAndValue
              label={t("sport")}
              name="sports"
              options={sportsOptions}
              isMulti={true}
              value={sportsOptions.filter((opt) =>
                formik.values.sports.includes(opt.value)
              )}
              onChange={(selected) => {
                const values = selected
                  ? selected.map((item) => item.value)
                  : [];
                formik.setFieldValue("sports", values);
              }}
              onBlur={() => formik.setFieldTouched("sports", true)}
              error={formik.touched.sports && formik.errors.sports}
              placeholder="Select sports"
              closeMenuOnSelect={false}
            />
          )}

          {/* Level */}
          {formik?.values?.subRole !== "influencer" && (
            <SelectOptionNlabel
              label={t("level")}
              name="level"
              options={translatedLevels}
              value={translatedLevels.find(
                (opt) => opt.value === formik.values.level
              )}
              onChange={(selected) =>
                formik.setFieldValue("level", selected ? selected.value : "")
              }
              onBlur={() => formik.setFieldTouched("level", true)}
              error={formik.touched.level && formik.errors.level}
            />
          )}

          {/* Team / Club name */}
          {formik.values.subRole === "team" && (
            <InputNLabel
              inputType="text"
              label={t("team")}
              name="teamName"
              placeholder="Enter team or club name"
              value={formik.values.teamName}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.teamName && formik.errors.teamName}
            />
          )}
          {/* Address */}

          <TextareaNlabel
            label={t("addressLabel")}
            name="address"
            value={formik.values.address}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder={t("addressPlaceholder")}
            error={
              formik.touched.address && formik.errors.address
                ? formik.errors.address
                : ""
            }
          />
          {/* Company Number */}
          {formik.values.subRole === "team" && (
            <InputNLabel
              inputType="text"
              label={t("companyLabel")}
              name="companyNumber"
              placeholder={t("companyPlaceholder")}
              value={formik.values.companyNumber}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={
                formik.touched.companyNumber && formik.errors.companyNumber
              }
            />
          )}

          {/* {Tax Number} */}
          {formik.values.subRole !== "team" && (
            <div className="w-full">
              <label className="flex items-center gap-2 mb-2 mt-6">
                <span>{t("taxTooltip.title")}</span>
                <div className="relative group">
                  <div className="flex items-center justify-center w-4 h-4 bg-blue-500 hover:bg-blue-600 rounded-full cursor-help transition-all duration-200">
                    <span className="text-xs font-bold text-white">i</span>
                  </div>
                  <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block z-50">
                    <div className="bg-gray-800 text-white text-xs rounded-lg py-2 px-3 w-64 shadow-lg">
                      <div className="space-y-1">
                        <div className="font-semibold text-blue-200">
                          {t("taxTooltip.euLawTitle")}
                        </div>
                        <div className="leading-tight">
                          {t("taxTooltip.euLaw")}
                        </div>
                        <div className="leading-tight">
                          {t("taxTooltip.options")}
                        </div>
                        <div className="text-gray-400 text-xs leading-tight">
                          {t("taxTooltip.disclaimer")}
                        </div>
                      </div>
                      <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                    </div>
                  </div>
                </div>
              </label>
              <InputNLabel
                inputType="text"
                label=""
                name="taxNumber"
                placeholder={t("taxTooltip.placeholder")}
                value={formik.values.taxNumber}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.taxNumber && formik.errors.taxNumber}
              />
            </div>
          )}
          {/* Location */}
          <InputNLabel
            label={t("location")}
            name="location"
            value={
              formik.values.location || {
                type: "Point",
                coordinates: [],
                locationName: "",
              }
            }
            onChange={(val) => {
              const locationValue =
                typeof val === "string"
                  ? { type: "Point", coordinates: [0, 0], locationName: val }
                  : val || {
                    type: "Point",
                    coordinates: [0, 0],
                    locationName: "",
                  };
              formik.setFieldValue("location", locationValue);
            }}
            onBlur={() => formik.setFieldTouched("location", true)}
            error={
              formik.touched.location && formik.errors.location?.locationName
                ? formik.errors.location.locationName
                : null
            }
            isLocationPicker
          />

          {/* Bio */}
          <TextareaNlabel
            label={t("bio")}
            name="biography"
            value={formik.values.biography}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.biography && formik.errors.biography}
          />

          {/* Achievements */}
          {/* <TextareaNlabel
            label={t("achievements")}
            name="achievements"
            value={formik.values.achievements}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.achievements && formik.errors.achievements}
          /> */}

          {/* Records */}
          {/* <TextareaNlabel
            label={t("records")}
            name="records"
            value={formik.values.records}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.records && formik.errors.records}
          /> */}

          {/* Goal */}
          {/* <TextareaNlabel
            label={t("goal")}
            name="goals"
            value={formik.values.goals}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.goals && formik.errors.goals}
          /> */}

          {/* Interest - Using the hook */}
          <SelectOptionNlabel
            label={t("interests")}
            name="interests"
            options={translatedInterestOptions}
            value={translatedInterestOptions
              .flatMap((group) => group.options || group)
              .filter((opt) => formik.values.interests.includes(opt.value))}
            onChange={(selected) => {
              const values = selected ? selected.map((item) => item.value) : [];
              formik.setFieldValue("interests", values);
            }}
            onBlur={() => formik.setFieldTouched("interests", true)}
            error={formik.touched.interests && formik.errors.interests}
            isMulti
            hasGroups
            placeholder="Select your interests"
            closeMenuOnSelect={false}
          />

          {/* Instagram */}
          <InputNLabel
            inputType="text"
            label={t("instagram")}
            name="socialLogins.instagram"
            placeholder={t("url")}
            value={formik.values.socialLogins?.instagram || ""}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={
              formik.touched.socialLogins?.instagram &&
              formik.errors.socialLogins?.instagram
            }
          />
          {/* Facebook */}
          <InputNLabel
            inputType="text"
            label={t("facebook")}
            name="socialLogins.facebook"
            placeholder={t("url")}
            value={formik.values.socialLogins?.facebook || ""}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={
              formik.touched.socialLogins?.facebook &&
              formik.errors.socialLogins?.facebook
            }
          />
          {/* TikTok */}
          <InputNLabel
            inputType="text"
            label={t("tikTok")}
            name="socialLogins.tikTok"
            placeholder={t("url")}
            value={formik.values.socialLogins?.tikTok || ""}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={
              formik.touched.socialLogins?.tikTok &&
              formik.errors.socialLogins?.tikTok
            }
          />
          {/* Youtube */}
          <InputNLabel
            inputType="text"
            label={t("youtube")}
            name="socialLogins.youTube"
            placeholder={t("url")}
            value={formik.values.socialLogins?.youTube || ""}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={
              formik.touched.socialLogins?.youTube &&
              formik.errors.socialLogins?.youTube
            }
          />
          {/* X (Twitter) */}
          <InputNLabel
            inputType="text"
            label={t("X")}
            name="socialLogins.x"
            placeholder={t("url")}
            value={formik.values.socialLogins?.x || ""}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={
              formik.touched.socialLogins?.x && formik.errors.socialLogins?.x
            }
          />
          {/* LinkedIn */}
          <InputNLabel
            inputType="text"
            label={t("linkedin")}
            name="socialLogins.linkedin"
            placeholder={t("url")}
            value={formik.values.socialLogins?.linkedin || ""}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={
              formik.touched.socialLogins?.linkedin &&
              formik.errors.socialLogins?.linkedin
            }
          />
          {/* Website */}
          <InputNLabel
            inputType="text"
            label={t("website")}
            name="socialLogins.website"
            placeholder={t("url")}
            value={formik.values.socialLogins?.website || ""}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={
              formik.touched.socialLogins?.website &&
              formik.errors.socialLogins?.website
            }
          />

          <div className="flex justify-end items-center gap-4">
            <button
              type="button"
              className="grayBtn"
              onClick={() =>
                router.push(`/sports-ambassador-profile/${subRole}/${user?.id}`)
              }
            >
              {t("cancel")}
            </button>
            <button type="submit" className="primaryBtn">
              {t("save")}
            </button>
          </div>
        </form>
      </DefaultLayout>
    </div>
  );
}
