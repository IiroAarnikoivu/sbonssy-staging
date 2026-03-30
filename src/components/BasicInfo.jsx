"use client";

import { sports } from "@/lib/helper";
import IconsLibrary from "@/util/IconsLibrary";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import DropdownIndicator from "./DropdownIndicator";

// import MapboxLocationPicker from "./MapboxLocationPicker";
// import MapboxLocationPicker from "./MapboxPicker";

const Select = dynamic(() => import("react-select"), { ssr: false });

const MapboxLocationPicker = dynamic(
  () => import("@/components/MapboxLocationPicker"),
  { ssr: false }
);
const roles = [
  "team",
  "athlete",
  "influencer",
  "coach",
  "ex-athlete",
  "para-athlete",
];
const levels = ["Olympic", "Professional", "Semi-Pro", "Amateur", "Junior"];

const BasicInfo = ({ formik, handleRoleChange, next }) => {
  const t = useTranslations("onboardingSport");
  const sportsT = useTranslations("SportsOptions.sports");
  const rolesT = useTranslations("SubRole.roles");
  const levelsT = useTranslations("Levels");
  const roleOptions = roles.map((role) => ({
    value: role,
    label: rolesT(role),
  }));
  const levelOptions = levels.map((level) => ({
    value: level,
    label: levelsT(level),
  }));
  // const sportsOptions = sports.map((sport) => ({ label: sport, value: sport }));
  const sportsOptions = sports.map((sport) => ({
    label: sportsT(sport),
    value: sport,
  }));

  // Handle Next button click with scroll
  const handleNextWithScroll = () => {
    window.scrollTo({ top: 0, behavior: "smooth" }); // Scroll to top
    next(); // Proceed to next step
  };
  return (
    <div className="lg:mt-8 mt-6 formInputs">
      <div className="text-center mb-6 lg:mb-8">
        <h2 className="text-[24px] lg:text-[32px]">{t("step1.heading")}</h2>
        <p className="text-base leading-[150%] tracking-[0%]">
          {t("step1.para")}
        </p>
      </div>

      {/* Role */}
      <div>
        <label className="mb-2 block mt-6">{t("step1.label1")}</label>
        <div className="relative w-full">
          <select
            name="subRole"
            value={formik.values.subRole}
            onChange={handleRoleChange}
            className="w-full border p-2 rounded"
          >
            <option value="">{t("step1.optionLabel3")}</option>
            {roleOptions.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
            {/* {roles.map((role) => (
              <option key={role} value={role}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </option>
            ))} */}
          </select>
          <IconsLibrary
            styling="absolute top-1/2 z-1 -translate-1/2 right-6"
            name={"dropdownSelect"}
          />
        </div>
        {formik.touched.subRole && formik.errors.subRole && (
          <div className="text-red-500 text-sm">{formik.errors.subRole}</div>
        )}
      </div>

      {formik.values.subRole && (
        <div>
          {/* Name */}
          {/* <div>
            <label className="block mb-2 mt-6">Enter your name</label>
            <input
              name="name"
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.name}
              className="w-full border p-2 rounded"
            />
            {formik.touched.name && formik.errors.name && (
              <div className="text-red-500 text-sm">{formik.errors.name}</div>
            )}
          </div> */}
          <div className="flex w-full gap-6 flex-col lg:flex-row">
            <div className="w-full">
              <label className="block mb-2 mt-6">{t("step1.label2")}</label>
              <input
                name="firstName"
                placeholder={t("step1.firstName")}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                type="text"
                value={formik.values.firstName}
                className="w-1/2 border p-2 rounded"
                // style={{ width: "50%" }}
              />
              {formik.touched.firstName && formik.errors.firstName && (
                <div className="text-red-500 text-sm mt-1">
                  {formik.errors.firstName}
                </div>
              )}
            </div>

            <div className="w-full">
              <label className="block mb-2 mt-6">{t("step1.label3")}</label>
              <input
                placeholder={t("step1.lastName")}
                name="lastName"
                type="text"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.lastName}
                className="w-1/2 border p-2 rounded"
                // style={{ width: "50%" }}
              />
              {formik.touched.lastName && formik.errors.lastName && (
                <div className="text-red-500 text-sm mt-1">
                  {formik.errors.lastName}
                </div>
              )}
            </div>
          </div>
          {/* {Addresss} */}
          <div className="w-full">
            <label className="block mb-2 mt-6">{t("step1.addressLabel")}</label>

            <textarea
              name="address"
              value={formik.values?.address}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              placeholder={t("step1.addressPlaceholder")}
              className="min-h-[145px]"
            />
            {formik.touched.address && formik.errors.address && (
              <div className="text-red-500 text-sm mt-1">
                {formik.errors.address}
              </div>
            )}
          </div>

          {/* {Company Number} */}
          {formik.values.subRole === "team" && (
            <div className="w-full">
              <label className="block mb-2 mt-6">
                {t("step1.companyLabel")}
              </label>
              <input
                name="companyNumber"
                placeholder={t("step1.companyPlaceholder")}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                type="text"
                value={formik.values.companyNumber}
                className="w-1/2 border p-2 rounded"
                // style={{ width: "50%" }}
              />
              {formik.touched.companyNumber && formik.errors.companyNumber && (
                <div className="text-red-500 text-sm mt-1">
                  {formik.errors.companyNumber}
                </div>
              )}
            </div>
          )}
          {/* {Tax Number} */}
          {formik.values.subRole !== "team" && (
            <div className="w-full">
              <label className="flex items-center gap-2 mb-2 mt-6">
                <span>{t("step1.taxTooltip.title")}</span>
                <div className="relative group">
                  <div className="flex items-center justify-center w-4 h-4 bg-blue-500 hover:bg-blue-600 rounded-full cursor-help transition-all duration-200">
                    <span className="text-xs font-bold text-white">i</span>
                  </div>
                  <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block z-50">
                    <div className="bg-gray-800 text-white text-xs rounded-lg py-2 px-3 w-64 shadow-lg">
                      <div className="space-y-1">
                        <div className="font-semibold text-blue-200">
                          {t("step1.taxTooltip.euLawTitle")}
                        </div>
                        <div className="leading-tight">
                          {t("step1.taxTooltip.euLaw")}
                        </div>
                        <div className="leading-tight">
                          {t("step1.taxTooltip.options")}
                        </div>
                        <div className="text-gray-400 text-xs leading-tight">
                          {t("step1.taxTooltip.disclaimer")}
                        </div>
                      </div>
                      <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                    </div>
                  </div>
                </div>
              </label>
              <input
                name="taxNumber"
                placeholder={t("step1.taxTooltip.placeholder")}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                type="text"
                value={formik.values.taxNumber}
                className="w-1/2 border p-2 rounded"
                // style={{ width: "50%" }}
              />
              {formik.touched.taxNumber && formik.errors.taxNumber && (
                <div className="text-red-500 text-sm mt-1">
                  {formik.errors.taxNumber}
                </div>
              )}
            </div>
          )}
          {/* Gender */}
          {formik.values.subRole !== "team" && (
            <div>
              <label className="block mb-2 mt-6">{t("step1.label4")}</label>
              <div className="relative w-full">
                <select
                  name="gender"
                  value={formik.values.gender}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="w-full border p-2 rounded"
                >
                  <option value="">{t("step1.optionLabel")}</option>
                  <option value="male">{t("step1.option1")}</option>
                  <option value="female">{t("step1.option2")}</option>
                  <option value="other">{t("step1.option3")}</option>
                </select>
                <IconsLibrary
                  styling="absolute top-1/2 z-1 -translate-1/2 right-6"
                  name={"dropdownSelect"}
                />
              </div>
              {formik.touched.gender && formik.errors.gender && (
                <div className="text-red-500 text-sm">
                  {formik.errors.gender}
                </div>
              )}
            </div>
          )}

          {/* Sports */}
          {formik.values.subRole !== "influencer" && (
            <div>
              <label className="block mb-2 mt-6">{t("step1.label5")}</label>
              <div className="customSelectDesign relative">
                {/* {formik.values.subRole === "team" ? ( */}
                <Select
                  isMulti
                  name="sports"
                  options={sportsOptions}
                  placeholder={t("step1.placeholder")}
                  value={sportsOptions.filter(
                    (opt) =>
                      Array.isArray(formik.values.sports) &&
                      formik.values.sports.includes(opt.value)
                  )}
                  closeMenuOnSelect={false}
                  onBlur={formik.handleBlur}
                  onChange={(selected) => {
                    const values = selected
                      ? selected.map((item) => item.value)
                      : [];
                    formik.setFieldValue("sports", values);
                  }}
                  styles={{
                    indicatorSeparator: () => ({
                      display: "none", // Removes the separator
                    }),
                  }}
                  components={{ DropdownIndicator }}
                />
                {/* ) : (
                  <select
                    name="sport"
                    value={
                      typeof formik.values.sport === "string"
                        ? formik.values.sport
                        : ""
                    }
                    onChange={formik.handleChange}
                    className="w-full border p-2 rounded"
                  >
                    <option value="">Select a sport</option>
                    {sports.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                )} */}
                {/* <IconsLibrary
                  styling="absolute top-1/2 z-1 -translate-1/2 right-6"
                  name={"dropdownSelect"}
                /> */}
              </div>
              {formik.touched.sports && formik.errors.sports && (
                <p className="text-red-500 text-sm mt-1">
                  {formik.errors.sports}
                </p>
              )}
            </div>
          )}

          {/* Level */}
          {formik.values.subRole !== "influencer" && (
            <div>
              <label className="block mb-2 mt-6">
                {formik.values.subRole === "athlete"
                  ? t("step1.label6")
                  : t("step1.label7")}
              </label>
              <div className="relative w-full">
                <select
                  name="level"
                  value={formik.values.level}
                  onChange={formik.handleChange}
                  className="w-full border p-2 rounded"
                >
                  <option value="">{t("step1.optionLabel2")}</option>
                  {levelOptions.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                  {/* {levels.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))} */}
                </select>
                <IconsLibrary
                  styling="absolute top-1/2 z-1 -translate-1/2 right-6"
                  name={"dropdownSelect"}
                />
              </div>
              {formik.touched.level && formik.errors.level && (
                <p className="text-red-500 text-sm mt-1">
                  {formik.errors.level}
                </p>
              )}
            </div>
          )}

          {/* Team Name */}
          {formik.values.subRole === "team" && (
            <div>
              <label className="block mb-2 mt-6">{t("step1.label8")}</label>
              <input
                name="teamName"
                type="text"
                value={formik.values.teamName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className="w-full border p-2 rounded"
              />
              {formik.touched.teamName && formik.errors.teamName && (
                <p className="text-red-500 text-sm mt-1">
                  {formik.errors.teamName}
                </p>
              )}
            </div>
          )}

          {/* Location */}
          <div>
            <label className="mb-2 mt-6 block">{t("step1.label9")}</label>
            {/* <input
          name="location"
          value={formik.values.location}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          className="w-full border p-2 rounded"
        /> */}
            <MapboxLocationPicker
              value={formik.values.location}
              onChange={(val) => {
                formik.setFieldValue("location", val);
                formik.setFieldTouched("location", true);
              }}
            />
            {formik.touched.location?.locationName &&
              formik.errors.location?.locationName && (
                <p className="text-red-500 text-sm mt-1">
                  {formik.errors.location.locationName}
                </p>
              )}
          </div>
          {/* <MapboxLocationPicker
        value={formik.values.location}
        onChange={(val) => formik.setFieldValue("location", val)}
      /> */}

          {/* Navigation */}
          <div className="flex justify-between items-center my-6">
            <div>{t("step")} 1/4</div>
            <button className="primaryBtn" onClick={handleNextWithScroll}>
              {t("next")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BasicInfo;
