"use client";
import { useFormik } from "formik";
import * as Yup from "yup";
import DefaultLayout from "@/components/Common/DefaultLayout.jsx/DefaultLayout";
import InputNLabel, {
  TextareaNlabel,
  SelectOptionNlabel,
  SelectOptionNlabelAndValue,
} from "@/components/Common/InputNLabel/InputNLabel";
import React, { useEffect } from "react";
import { sports, toCamelCase } from "@/lib/helper";
import IconsLibrary from "@/util/IconsLibrary";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import Swal from "sweetalert2";
import { useTranslations } from "next-intl";
import useTranslatedInterests from "@/hook/useInterestTranslations";

const levels = ["Olympic", "Professional", "Semi-Pro", "Amateur", "Junior"];

const validationSchema = Yup.object().shape({
  name: Yup.string().required("Name is required"),
  gender: Yup.string().when("subRole", {
    is: "team",
    then: (schema) => schema.optional(),
    otherwise: (schema) => schema.required("Gender is required"),
  }),
  sports: Yup.array().of(Yup.string()).optional(),
  level: Yup.string().when("subRole", {
    is: "influencer",
    then: (schema) => schema.optional(),
    otherwise: (schema) => schema.required("Level is required"),
  }),
  teamName: Yup.string().when("subRole", {
    is: "team",
    then: (schema) => schema.required("Team name is required"),
    otherwise: (schema) => schema.optional(),
  }),
  location: Yup.object()
    .shape({
      type: Yup.string().required().oneOf(["Point"]),
      coordinates: Yup.array().of(Yup.number().required()).length(2).required(),
      locationName: Yup.string().required("Location is required"),
    })
    .required("Location is required"),
  biography: Yup.string().required("Biography is required"),
  achievements: Yup.string(),
  records: Yup.string(),
  goals: Yup.string(),
  interests: Yup.array()
    .of(Yup.string())
    .min(1, "Select at least one")
    .required("Interests are required"),
  subRole: Yup.string().required("Sub role is required"),
  onboardPhotos: Yup.array()
    .min(1, "Upload a photo")
    .required("Photo is required"),
});

const SportsAmbassadorForm = ({ userId, onSuccess, isAdminEdit = false }) => {
  const { user, setUser } = useAuthStore();
  const router = useRouter();
  const t = useTranslations("Sports.edit");
  const sportsT = useTranslations("SportsOptions.sports");
  const levelT = useTranslations("Levels");
  const toastAlert = useTranslations("Sweetalert");
  const subrole = toCamelCase(user?.onboardedDetails?.subRole);

  const translatedInterestOptions = useTranslatedInterests();
  const sportsOptions = sports.map((sport) => ({
    label: sportsT(sport) || sport,
    value: sport,
  }));

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
      },
      selectedRole: "sports-ambassador",
      onboardPhotos: [],
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      const body = {
        role: "sports-ambassador",
        subRole: values.subRole,
        isProfileCompleted: true,
        athlete: values.subRole === "athlete" && {
          name: values.name,
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
          },
        },
        team: values.subRole === "team" && {
          name: values.name,
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
          },
        },
        influencer: values.subRole === "influencer" && {
          name: values.name,
          gender: values.gender,
          sports: values.sports,
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
          },
        },
        coach: values.subRole === "coach" && {
          name: values.name,
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
          },
        },
        exAthlete: values.subRole === "ex-athlete" && {
          name: values.name,
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
          },
        },
        paraAthlete: values.subRole === "para-athlete" && {
          name: values.name,
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
          },
        },
      };

      if (isAdminEdit) {
        body.userId = userId;
      }
      try {
        const resp = await api.put("admin/users", {
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
          }
          router.push("/admin/users");
          if (!isAdminEdit) {
            router.push(
              `/sports-ambassador-profile/${values.subRole}/${user?.id}`
            );
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

  useEffect(() => {
    if (userId) {
      (async () => {
        try {
          const response = await api.get(
            `/user?supabaseId=${
              user?.onboardedDetails?.invitedBy
                ? user?.onboardedDetails?.invitedBy?.supabaseId
                : userId
            }`
          );

          const profile = response.data;
          const sub_role = profile?.[toCamelCase(profile.subRole)];

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
            sports: sub_role?.sports || [],
            level: sub_role?.level || "",
            teamName: sub_role?.teamClubName || "",
            onboardPhotos: sub_role?.images || [],
            socialLogins: {
              instagram: sub_role?.socialMedia?.instagram || "",
              facebook: sub_role?.socialMedia?.facebook || "",
              tikTok: sub_role?.socialMedia?.tiktok || "",
              youTube: sub_role?.socialMedia?.youtube || "",
              x: sub_role?.socialMedia?.twitter || "",
              website: sub_role?.socialMedia?.website || "",
            },
          });
        } catch (error) {
          console.error("Failed to fetch user data:", error);
        }
      })();
    }
  }, [userId]);

  return (
    <div>
      <DefaultLayout styling="py-8">
        <form
          onSubmit={formik.handleSubmit}
          className="flex flex-col gap-10 max-w-[560px] mx-auto"
        >
          {/* Sport */}
          <SelectOptionNlabelAndValue
            label={t("sport")}
            name="sports"
            options={sportsOptions}
            isMulti={true}
            value={sportsOptions.filter((opt) =>
              formik.values.sports.includes(opt.value)
            )}
            onChange={(selected) => {
              const values = selected ? selected.map((item) => item.value) : [];
              formik.setFieldValue("sports", values);
            }}
            onBlur={() => formik.setFieldTouched("sports", true)}
            error={formik.touched.sports && formik.errors.sports}
            placeholder="Select sports (min 5 for teams, 1 for others)"
            closeMenuOnSelect={false}
          />

          {/* Level */}
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

          {/* Interest */}
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
                isAdminEdit
                  ? router.push("/admin/users")
                  : router.push(
                      `/sports-ambassador-profile/${formik.values.subRole}/${user?.id}`
                    )
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
};

export default SportsAmbassadorForm;
