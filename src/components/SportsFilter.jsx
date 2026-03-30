"use client";
import useSportsTranslations from "@/hook/useSportsTranslations";
import { interestOptions, summerSports, winterSports } from "@/lib/helper";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom"; 
import { SelectSort } from "./AllSports";
import ScrollLock from "./ScrollLock";

const Select = dynamic(
  () => import("react-select").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="w-full p-2 border border-gray-300 rounded-md h-[38px] bg-gray-100" />
    ),
  },
);

const SportsFilters = ({ currentFilters, variant = "sidebar" }) => {
  const t = useTranslations("MarketPlace");
  const router = useRouter();
  const translateSports = useSportsTranslations();
  const [isMounted, setIsMounted] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const dropdownRef = useRef(null);
  // Local buffered filters
  const [localFilters, setLocalFilters] = useState({
    subRole: [],
    season: "",
    sport: [],
    level: [],
    gender: "",
    interests: [],
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sort options
  const sortOptions = [
    { value: "", label: t("sports.sort.heading") },
    { value: "createdAt-desc", label: t("sports.sort.latest") },
    { value: "createdAt-asc", label: t("sports.sort.oldest") },
    { value: "name-asc", label: t("sports.sort.nameAsc") },
    { value: "name-desc", label: t("sports.sort.nameDesc") },
  ];

  const activeSort = currentFilters.sort || "";

  // Handle sort change
  const handleSortChange = (sortValue) => {
    setIsSortOpen(false);
    const params = new URLSearchParams(window.location.search);

    if (sortValue) {
      params.set("sort", sortValue);
    } else {
      params.delete("sort");
    }

    params.set("page", "1");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsSortOpen(false);
      }
    };

    if (isSortOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSortOpen]);

  const setSingle = (name, value) => {
    setLocalFilters((prev) => ({ ...prev, [name]: value }));
  };

  const setMulti = (name, values) => {
    setLocalFilters((prev) => ({ ...prev, [name]: values }));
  };

  const resetAllFilters = () => {
    setLocalFilters({
      subRole: [],
      season: "",
      sport: [],
      level: [],
      gender: "",
      interests: [],
    });
  };

  // Clear all filters and immediately update the URL to reflect no filters applied
  const applyClearedFilters = () => {
    // Reset local state
    resetAllFilters();
    // Build URL with only non-filter params
    const params = new URLSearchParams();
    // Do not set page here; keep URL clean until user clicks pagination
    if (currentFilters.search) params.set("search", currentFilters.search);
    if (currentFilters.sort) params.set("sort", currentFilters.sort);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleCheckboxChange = (name, value) => {
    const current = localFilters[name] || [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setMulti(name, updated);
  };

  const getCurrentInterests = () => {
    if (!localFilters.interests || localFilters.interests.length === 0)
      return [];
    return localFilters.interests.map((value) => {
      let found = null;
      interestOptions.forEach((group) => {
        const opt = group.options.find((o) => o.value === value);
        if (opt) found = opt;
      });
      return found || { value, label: value };
    });
  };

  const getCurrentRoles = () => {
    if (!localFilters.subRole) return [];
    return localFilters.subRole.map((value) => {
      const found = subRoleOptions.find((option) => option.value === value);
      return found || { value, label: value };
    });
  };

  const getCurrentLevels = () => {
    if (!localFilters.level) return [];
    return localFilters.level.map((value) => {
      const found = levelOptions.find((option) => option.value === value);
      return found || { value, label: value };
    });
  };

  const getCurrentSeason = () => {
    if (!localFilters.season) return null;
    return (
      seasonOptions.find((option) => option.value === localFilters.season) ||
      null
    );
  };

  const getCurrentGender = () => {
    if (!localFilters.gender) return null;
    return (
      genderOptions.find((option) => option.value === localFilters.gender) ||
      null
    );
  };

  const subRoleOptions = [
    { value: "influencer", label: t("sportsFilters.roleTypes.Influencer") },
    { value: "coach", label: t("sportsFilters.roleTypes.Coach") },
    { value: "athlete", label: t("sportsFilters.roleTypes.Athlete") },
    { value: "paraAthlete", label: t("sportsFilters.roleTypes.Para-Athlete") },
    { value: "exAthlete", label: t("sportsFilters.roleTypes.Ex-Athlete") },
    { value: "team", label: t("sportsFilters.roleTypes.Team") },
  ];

  const levelOptions = [
    { value: "Olympic", label: t("sportsFilters.level.Olympic") },
    { value: "Professional", label: t("sportsFilters.level.Professional") },
    { value: "Semi-Pro", label: t("sportsFilters.level.Semi-Pro") },
    { value: "Amateur", label: t("sportsFilters.level.Amateur") },
    { value: "Junior", label: t("sportsFilters.level.Junior") },
  ];

  // Always keep gender values in English for backend/search while labels are translated
  const genderOptions = [
    { value: "male", label: t("sportsFilters.gender.male") },
    { value: "female", label: t("sportsFilters.gender.female") },
    { value: "other", label: t("sportsFilters.gender.other") },
  ];

  const seasonOptions = [
    { value: "summer", label: t("sportsFilters.seasons.Summer-Sports") },
    { value: "winter", label: t("sportsFilters.seasons.Winter-Sports") },
  ];

  const socialMediaOptions = [
    "instagram",
    "twitter",
    "youtube",
    "facebook",
    "tiktok",
    "linkedin",
  ];

  const customStyles = {
    container: (provided) => ({
      ...provided,
      width: "100%",
      maxWidth: "100%",
      minWidth: 0,
      flex: "1 1 0%",
    }),
    control: (provided) => ({
      ...provided,
      border: "1px solid #0C0D06",
      boxShadow: "none",
      borderRadius: "12px",
      backgroundColor: "#F3F3F2",
      minHeight: "40px",
      width: "100%",
      maxWidth: "100%",
      overflow: "hidden",
      cursor: "pointer",
      "&:hover": {
        border: "1px solid #0C0D06",
      },
    }),
    valueContainer: (provided) => ({
      ...provided,
      height: "40px",
      display: "flex",
      alignItems: "center",
      flexWrap: "nowrap",
      minWidth: 0,
      overflowX: "auto",
      padding: "0 12px",
    }),
    input: (provided) => ({
      ...provided,
      margin: 0,
      padding: 0,
    }),
    indicatorsContainer: (provided) => ({
      ...provided,
      height: "40px",
    }),
    indicatorSeparator: () => ({
      display: "none",
    }),
    clearIndicator: () => ({
      display: "none",
    }),
    dropdownIndicator: (provided, state) => ({
      ...provided,
      color: "#000000",
      transition: "transform 0.2s ease",
      transform: state.selectProps.menuIsOpen
        ? "rotate(180deg)"
        : "rotate(0deg)",
      "&:hover": {
        color: "#000000",
      },
      svg: {
        width: 16,
        height: 16,
      },
    }),
    menu: (provided) => ({
      ...provided,
      zIndex: 99999,
      position: "absolute",
      // backgroundColor: "#F3F3F2",
    }),
    menuPortal: (provided) => ({
      ...provided,
      zIndex: 9999,
    }),
    menuList: (provided) => ({
      ...provided,
      maxHeight: "300px",
    }),
    option: (provided, state) => ({
      ...provided,
      cursor: "pointer",
      backgroundColor: state.isSelected
        ? "#E0E7FF"
        : state.isFocused
          ? "#F3F4F6"
          : "white",
      color: state.isSelected ? "#4338CA" : "#0C0D06",
      "&:active": {
        backgroundColor: "#E0E7FF",
      },
    }),
  };

  const hasActiveFilters =
    localFilters.season ||
    localFilters.gender ||
    (localFilters.subRole && localFilters.subRole.length > 0) ||
    (localFilters.level && localFilters.level.length > 0) ||
    (localFilters.sport && localFilters.sport.length > 0) ||
    (localFilters.interests && localFilters.interests.length > 0);

  const groupedSportsOptions = [
    {
      label: t("sportsFilters.seasons.Summer-Sports"),
      options: summerSports.map((sport) => ({
        value: sport,
        label: translateSports(sport),
      })),
    },
    {
      label: t("sportsFilters.seasons.Winter-Sports"),
      options: winterSports.map((sport) => ({
        value: sport,
        label: translateSports(sport),
      })),
    },
  ];

  const getCurrentSports = () => {
    if (!localFilters.sport) return [];
    return localFilters.sport.map((sport) => ({
      value: sport,
      label: translateSports(sport),
    }));
  };

  useEffect(() => {
    setLocalFilters({
      subRole: currentFilters.subRole ? currentFilters.subRole.split(",") : [],
      season: currentFilters.season || "",
      sport: currentFilters.sport ? currentFilters.sport.split(",") : [],
      level: currentFilters.level ? currentFilters.level.split(",") : [],
      gender: currentFilters.gender || "",
      interests: currentFilters.interests
        ? currentFilters.interests.split(",")
        : [],
    });
  }, [currentFilters]);

  const pushUrlFromLocal = () => {
    const params = new URLSearchParams();
    // Do not set page here; only append page on explicit pagination actions
    if (currentFilters.search) params.set("search", currentFilters.search);
    if (currentFilters.sort) params.set("sort", currentFilters.sort);
    if (localFilters.season) params.set("season", localFilters.season);
    if (localFilters.gender) params.set("gender", localFilters.gender);
    if (localFilters.subRole?.length)
      params.set("subRole", localFilters.subRole.join(","));
    if (localFilters.level?.length)
      params.set("level", localFilters.level.join(","));
    if (localFilters.sport?.length)
      params.set("sport", localFilters.sport.join(","));
    if (localFilters.interests?.length)
      params.set("interests", localFilters.interests.join(","));
    router.push(`?${params.toString()}`, { scroll: false });
  };

  // Auto-apply on change for top bar (debounced)
  useEffect(() => {
    if (variant !== "bar") return;
    const id = setTimeout(() => {
      pushUrlFromLocal();
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant, JSON.stringify(localFilters)]);

  // Render tag chips summary for bar variant
  const renderChips = () => {
    const chips = [];
    if (localFilters.subRole?.length)
      chips.push(
        ...localFilters.subRole.map((v) => ({ key: `subRole:${v}`, label: v })),
      );
    if (localFilters.sport?.length)
      chips.push(
        ...localFilters.sport.map((v) => ({
          key: `sport:${v}`,
          label: translateSports(v),
        })),
      );
    if (localFilters.level?.length)
      chips.push(
        ...localFilters.level.map((v) => ({ key: `level:${v}`, label: v })),
      );
    if (localFilters.season)
      chips.push({
        key: `season:${localFilters.season}`,
        label: localFilters.season,
      });
    if (localFilters.gender)
      chips.push({
        key: `gender:${localFilters.gender}`,
        label: localFilters.gender,
      });

    return (
      <div className="flex items-center flex-wrap gap-2 mt-[27px]">
        {chips.map((c) => (
          <span
            key={c.key}
            className="inline-flex items-center gap-1 bg-gray-100 text-gray-800 text-sm px-4 py-2 z-50"
          >
            {c.label}
            <button
              className="text-gray-500 hover:text-gray-700"
              onClick={() => {
                const [group, val] = c.key.split(":");
                if (group === "season") {
                  setSingle("season", "");
                } else if (group === "gender") {
                  setSingle("gender", "");
                } else if (group === "subRole") {
                  setMulti(
                    "subRole",
                    (localFilters.subRole || []).filter((x) => x !== val),
                  );
                } else if (group === "sport") {
                  setMulti(
                    "sport",
                    (localFilters.sport || []).filter((x) => x !== val),
                  );
                } else if (group === "level") {
                  setMulti(
                    "level",
                    (localFilters.level || []).filter((x) => x !== val),
                  );
                }
              }}
            >
              <svg
                width="19"
                height="19"
                viewBox="0 0 19 19"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M14.3995 14.046L14.0459 14.3995C13.8507 14.5948 13.5341 14.5948 13.3388 14.3995L9.27298 10.3336L5.20708 14.3995C5.01186 14.5948 4.69527 14.5948 4.5 14.3995L4.14645 14.0459C3.95118 13.8507 3.95118 13.5341 4.14645 13.3388L8.21233 9.27298L4.14645 5.20708C3.95118 5.01186 3.95118 4.69527 4.14645 4.5L4.5 4.14645C4.69526 3.95119 5.01186 3.95119 5.20708 4.14645L9.27298 8.21233L13.3388 4.14645C13.5341 3.95118 13.8507 3.95118 14.0459 4.14645L14.3995 4.5C14.5948 4.69526 14.5948 5.01186 14.3995 5.20708L10.3336 9.27298L14.3995 13.3388C14.5948 13.5341 14.5948 13.8507 14.3995 14.046Z"
                  fill="black"
                />
              </svg>
            </button>
          </span>
        ))}
        {chips.length > 0 && (
          <button
            onClick={applyClearedFilters}
            className="text-[#0C0D06] ml-2 text-[12px] z-20"
          >
            {t("allClear")}
          </button>
        )}
      </div>
    );
  };

  // Render the modal content (reusable for both sidebar and mobile)
  const renderFilterContent = () => (
    <>
      {/* Role type */}
      <div className="space-y-2 border-b-1 border-[#DADAD9] pb-5 pt-5">
        <div className="flex justify-between items-center mb-3">
          <span className="text-lg font-bold text-[#000000]">
            {t("sportsFilters.one")}
          </span>
          {localFilters.subRole && localFilters.subRole.length > 0 && (
            <button
              className="text-base text-[#0C0D06]"
              onClick={() => setMulti("subRole", [])}
            >
              {t("clear")}
            </button>
          )}
        </div>
        {/* Role type (Multi-Select Dropdown) */}
        <div className="space-y-2 border-b-1 border-[#DADAD9] pb-5 pt-5">
          <div className="flex justify-between items-center mb-3">
            <span className="text-lg font-bold text-[#000000]">
              {t("sportsFilters.one")}
            </span>
            {localFilters.subRole && localFilters.subRole.length > 0 && (
              <button
                className="text-base text-[#0C0D06]"
                onClick={() => setMulti("subRole", [])}
              >
                {t("clear")}
              </button>
            )}
          </div>
          {isMounted && (
            <Select
              isMulti
              options={subRoleOptions}
              value={getCurrentRoles()}
              onChange={(selected) =>
                setMulti(
                  "subRole",
                  selected.map((s) => s.value),
                )
              }
              placeholder={t("sportsFilters.roleTypes.All-Roles")}
              className="w-full min-w-0"
              classNamePrefix="react-select"
              styles={customStyles}
              menuPortalTarget={
                typeof window !== "undefined" ? document.body : null
              }
            />
          )}
        </div>
        <div className="space-y-1">
          {[
            {
              value: "summer",
              label: t("sportsFilters.seasons.Summer-Sports"),
            },
            {
              value: "winter",
              label: t("sportsFilters.seasons.Winter-Sports"),
            },
          ].map((season) => (
            <label
              key={season.value}
              className="flex items-center space-x-2 mb-2 cursor-pointer"
            >
              <input
                type="radio"
                name="season"
                value={season.value}
                checked={localFilters.season === season.value}
                onChange={(e) => {
                  setSingle("season", e.target.value);
                  setMulti("sport", []);
                }}
                className="size-4.5 ml-3"
              />
              <span className="text-base leading-6 font-normal text-[#0C0D06]">
                {season.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="border-b border-[#DADAD9] pb-5 pt-5 hidden">
        <div className="flex justify-between items-center mb-5">
          <label className="text-[18px] font-bold leading-6 text-[#000000]">
            {t("sportsFilters.three")}
          </label>
        </div>
      </div>
        {/* Sport (Commented out as in original code) */}
        <div className="border-b-1 border-[#DADAD9] pb-5">
          <div className="flex justify-between items-center mb-5">
            <label className="text-[18px] font-bold leading-6 text-[#000000]">
              {t("sportsFilters.sports")}
            </label>
            {localFilters.sport && localFilters.sport.length > 0 && (
              <button
                className="text-base font-normal text-[#000000] leading-6 cursor-pointer"
                onClick={() => setMulti("sport", [])}
              >
                {t("clear")}
              </button>
            )}
          </div>
          {isMounted && (
            <Select
              isMulti
              options={
                localFilters.season === "winter"
                  ? groupedSportsOptions[1].options
                  : localFilters.season === "summer"
                    ? groupedSportsOptions[0].options
                    : groupedSportsOptions
              }
              value={getCurrentSports()}
              onChange={(selected) =>
                setMulti(
                  "sport",
                  selected.map((s) => s.value),
                )
              }
              placeholder={t("sportsFilters.sportsplaceholder")}
              className="w-full min-w-0"
              classNamePrefix="react-select"
              styles={customStyles}
              menuPortalTarget={
                typeof window !== "undefined" ? document.body : null
              }
            />
          )}
        </div>
        {/* Level (Multi-Select Dropdown) */}
        {/* Level (Multi-Select Dropdown) */}
        <div className="border-b-1 border-[#DADAD9] pb-5 pt-5">
          <div className="flex justify-between items-center mb-5">
            <label className="text-[18px] font-bold leading-6 text-[#000000]">
              {t("sportsFilters.four")}
            </label>
            {localFilters.level && localFilters.level.length > 0 && (
              <button
                className="text-base font-normal text-[#000000] leading-6"
                onClick={() => setMulti("level", [])}
              >
                {t("clear")}
              </button>
            )}
          </div>
          {isMounted && (
            <Select
              isMulti
              options={levelOptions}
              value={getCurrentLevels()}
              onChange={(selected) =>
                setMulti(
                  "level",
                  selected.map((s) => s.value),
                )
              }
              placeholder={t("sportsFilters.level.All-level")}
              className="w-full min-w-0"
              classNamePrefix="react-select"
              styles={customStyles}
              menuPortalTarget={
                typeof window !== "undefined" ? document.body : null
              }
            />
          )}
        </div>

      {/* Gender */}
      <div className="border-b-0 border-[#DADAD9] pb-5 pt-5">
        <div className="flex justify-between items-center mb-5">
          <label className="text-[18px] font-bold leading-6 text-[#000000]">
            {t("sportsFilters.five")}
          </label>
          {localFilters.gender && (
            <button
              className="text-base font-normal text-[#000000] leading-6"
              onClick={() => setSingle("gender", "")}
            >
              {t("clear")}
            </button>
          )}
        </div>
        <div className="space-y-1">
          {genderOptions.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center space-x-2 mb-2 cursor-pointer"
            >
              <input
                type="radio"
                name="gender"
                value={opt.value}
                checked={localFilters.gender === opt.value}
                onChange={(e) => setSingle("gender", e.target.value)}
                className="size-4.5 ml-3"
              />
              <span className="text-base leading-6 font-normal text-[#0C0D06]">
                {opt.label}
              </span>
            </label>
          ))}
        </div>
      </div>
    </>
  );

  if (variant === "sidebar") {
    return (
      <div className="w-full max-h-[100vh] lg:max-h-full  lg:w-72 p-1 sm:p-6 bg-white sticky top-0 h-full max-lg:overflow-y-auto lg:h-full">
        {/* Heading section */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-normal leading-[22px]">{t("filters")}</h2>
        </div>
        {renderFilterContent()}
        {/* Footer actions */}
        <div className="border-[#DADAD9] flex gap-3 left-0 z-10 py-6 lg:py-8 bg-white">
          <button
            onClick={applyClearedFilters}
            className="flex-1 border border-[#0C0D06] text-sm rounded-[12px] py-2 text-[#0C0D06] w-full"
          >
            {t("allClear")}
          </button>
          <button
            onClick={pushUrlFromLocal}
            className="flex-1 bg-(--reddishPurple) text-white text-sm rounded-[12px] px-3 py-2 text-nowrap w-full "
          >
            {t("showResults") || "Show Results"}
          </button>
        </div>
      </div>
    );
  }

  // Top bar variant
  return (
    <div className="w-full overflow-visible">
      {/* Filter Button for Mobile */}
      <div className="flex justify-between lg:hidden relative z-[100]">
        <button
          onClick={() => setIsFilterModalOpen(true)}
          className="rounded-xl border border-slate-900 bg-gray-50 text-black flex items-center gap-4 px-6 py-2 relative"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M18 4H2C1.45 4 1 4.45 1 5C1 5.55 1.45 6 2 6H18C18.55 6 19 5.55 19 5C19 4.45 18.55 4 18 4ZM16 9H4C3.45 9 3 9.45 3 10C3 10.55 3.45 11 4 11H16C16.55 11 17 10.55 17 10C17 9.45 16.55 9 16 9ZM13 14H7C6.45 14 6 14.45 6 15C6 15.55 6.45 16 7 16H13C13.55 16 14 15.55 14 15C14 14.45 13.55 14 13 14Z"
              fill="black"
            />
          </svg>
          {t("filters")}
        </button>

        <SelectSort
          activeSort={activeSort}
          sortOptions={sortOptions}
          isSortOpen={isSortOpen}
          setIsSortOpen={setIsSortOpen}
          handleSortChange={handleSortChange}
          dropdownRef={dropdownRef}
        />
      </div>

      {/* Desktop Filters - Hidden on Mobile */}
      <div className="hidden lg:flex flex-wrap gap-3 items-center justify-center overflow-visible">
        {isMounted && (
          <div className="min-w-[150px] customSelectDesign">
            <Select
              isMulti
              options={subRoleOptions}
              value={getCurrentRoles()}
              onChange={(selected) =>
                setMulti(
                  "subRole",
                  selected.map((s) => s.value),
                )
              }
              placeholder={t("sportsFilters.one")}
              classNamePrefix="react-select"
              styles={customStyles}
              menuPortalTarget={
                typeof window !== "undefined" ? document.body : null
              }
            />
          </div>
        )}
        {isMounted && (
          <div className="min-w-[180px] customSelectDesign">
            <Select
              isMulti
              options={
                localFilters.season === "winter"
                  ? groupedSportsOptions[1].options
                  : localFilters.season === "summer"
                    ? groupedSportsOptions[0].options
                    : groupedSportsOptions
              }
              value={getCurrentSports()}
              onChange={(selected) =>
                setMulti(
                  "sport",
                  selected.map((s) => s.value),
                )
              }
              placeholder={t("sportsFilters.sports")}
              classNamePrefix="react-select"
              styles={customStyles}
              menuPortalTarget={
                typeof window !== "undefined" ? document.body : null
              }
            />
          </div>
        )}
        {/* Location Search Removed */}
        {isMounted && (
          <div className="min-w-[160px] customSelectDesign">
            <Select
              isMulti
              options={levelOptions}
              value={getCurrentLevels()}
              onChange={(selected) =>
                setMulti(
                  "level",
                  selected.map((s) => s.value),
                )
              }
              placeholder={t("sportsFilters.four")}
              classNamePrefix="react-select"
              styles={customStyles}
              menuPortalTarget={
                typeof window !== "undefined" ? document.body : null
              }
            />
          </div>
        )}
        {isMounted && (
          <div className="min-w-[140px] customSelectDesign">
            <Select
              options={seasonOptions}
              value={getCurrentSeason()}
              onChange={(selected) => {
                setSingle("season", selected ? selected.value : "");
                setMulti("sport", []);
              }}
              placeholder={t("sportsFilters.seasons.All-Seasons")}
              isClearable
              classNamePrefix="react-select"
              styles={customStyles}
              menuPortalTarget={
                typeof window !== "undefined" ? document.body : null
              }
            />
          </div>
        )}
        {isMounted && (
          <div className="min-w-[140px] customSelectDesign">
            <Select
              options={genderOptions}
              value={getCurrentGender()}
              onChange={(selected) =>
                setSingle("gender", selected ? selected.value : "")
              }
              placeholder={t("sportsFilters.five")}
              isClearable
              classNamePrefix="react-select"
              styles={customStyles}
              menuPortalTarget={
                typeof window !== "undefined" ? document.body : null
              }
            />
          </div>
        )}
      </div>
      {renderChips()}

      <ScrollLock isLocked={isFilterModalOpen} />
      
      {/* Mobile Filter Modal - USING PORTAL */}
      {isFilterModalOpen && isMounted && typeof document !== 'undefined' && document.body && createPortal(
        <div className="fixed inset-0 z-[9999] lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setIsFilterModalOpen(false)}
          />

          {/* Modal Content */}
          <div className="relative bg-white z-[10000] overflow-y-auto overflow-x-visible h-full max-h-screen">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-[#DADAD9] z-10 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold">{t("filters")}</h2>
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="text-2xl text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            {/* Modal Body - Reuse Sidebar Content */}
            <div className="px-6 pb-6">
              {/* Role type */}
              <div className="space-y-2 border-b-1 border-[#DADAD9] pb-5 pt-5">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-lg font-bold text-[#000000]">
                    {t("sportsFilters.one")}
                  </span>
                  {localFilters.subRole && localFilters.subRole.length > 0 && (
                    <button
                      className="text-base text-[#0C0D06]"
                      onClick={() => setMulti("subRole", [])}
                    >
                      {t("clear")}
                    </button>
                  )}
                </div>
                {isMounted && (
                  <Select
                    isMulti
                    options={subRoleOptions}
                    value={getCurrentRoles()}
                    onChange={(selected) =>
                      setMulti(
                        "subRole",
                        selected.map((s) => s.value),
                      )
                    }
                    placeholder={t("sportsFilters.roleTypes.All-Roles")}
                    className="w-full min-w-0"
                    classNamePrefix="react-select"
                    styles={customStyles}
                    menuPortalTarget={
                      typeof window !== "undefined" ? document.body : null
                    }
                  />
                )}
              </div>

              {/* Season Filter */}
              <div className="border-b-1 border-[#DADAD9] pb-5 pt-5">
                <div className="flex justify-between items-center mb-5">
                  <label className="text-[18px] font-bold leading-6 text-[#000000]">
                    {t("sportsFilters.two")}
                  </label>
                  {localFilters.season && (
                    <button
                      className="text-base font-normal text-[#000000] leading-6"
                      onClick={() => setSingle("season", "")}
                    >
                      {t("clear")}
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  {[
                    {
                      value: "summer",
                      label: t("sportsFilters.seasons.Summer-Sports"),
                    },
                    {
                      value: "winter",
                      label: t("sportsFilters.seasons.Winter-Sports"),
                    },
                  ].map((season) => (
                    <label
                      key={season.value}
                      className="flex items-center space-x-2 mb-2 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="season"
                        value={season.value}
                        checked={localFilters.season === season.value}
                        onChange={(e) => {
                          setSingle("season", e.target.value);
                          setMulti("sport", []);
                        }}
                        className="size-4.5 ml-3"
                      />
                      <span className="text-base leading-6 font-normal text-[#0C0D06]">
                        {season.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Location Filter Removed */}

              {/* Sport */}
              <div className="border-b-1 border-[#DADAD9] pb-5 pt-5">
                <div className="flex justify-between items-center mb-5">
                  <label className="text-[18px] font-bold leading-6 text-[#000000]">
                    {t("sportsFilters.sports")}
                  </label>
                  {localFilters.sport && localFilters.sport.length > 0 && (
                    <button
                      className="text-base font-normal text-[#000000] leading-6 cursor-pointer"
                      onClick={() => setMulti("sport", [])}
                    >
                      {t("clear")}
                    </button>
                  )}
                </div>
                {isMounted && (
                  <Select
                    isMulti
                    options={
                      localFilters.season === "winter"
                        ? groupedSportsOptions[1].options
                        : localFilters.season === "summer"
                          ? groupedSportsOptions[0].options
                          : groupedSportsOptions
                    }
                    value={getCurrentSports()}
                    onChange={(selected) =>
                      setMulti(
                        "sport",
                        selected.map((s) => s.value),
                      )
                    }
                    placeholder={t("sportsFilters.sportsplaceholder")}
                    className="w-full min-w-0"
                    classNamePrefix="react-select"
                    styles={customStyles}
                    menuPortalTarget={
                      typeof window !== "undefined" ? document.body : null
                    }
                  />
                )}
              </div>

              {/* Level */}
              <div className="border-b-1 border-[#DADAD9] pb-5 pt-5">
                <div className="flex justify-between items-center mb-5">
                  <label className="text-[18px] font-bold leading-6 text-[#000000]">
                    {t("sportsFilters.four")}
                  </label>
                  {localFilters.level && localFilters.level.length > 0 && (
                    <button
                      className="text-base font-normal text-[#000000] leading-6"
                      onClick={() => setMulti("level", [])}
                    >
                      {t("clear")}
                    </button>
                  )}
                </div>
                {isMounted && (
                  <Select
                    isMulti
                    options={levelOptions}
                    value={getCurrentLevels()}
                    onChange={(selected) =>
                      setMulti(
                        "level",
                        selected.map((s) => s.value),
                      )
                    }
                    placeholder={t("sportsFilters.level.All-level")}
                    className="w-full min-w-0"
                    classNamePrefix="react-select"
                    styles={customStyles}
                    menuPortalTarget={
                      typeof window !== "undefined" ? document.body : null
                    }
                  />
                )}
              </div>

              {/* Gender */}
              <div className="border-b-0 border-[#DADAD9] pb-5 pt-5">
                <div className="flex justify-between items-center mb-5">
                  <label className="text-[18px] font-bold leading-6 text-[#000000]">
                    {t("sportsFilters.five")}
                  </label>
                  {localFilters.gender && (
                    <button
                      className="text-base font-normal text-[#000000] leading-6"
                      onClick={() => setSingle("gender", "")}
                    >
                      {t("clear")}
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  {genderOptions.map((opt) => (
                    <label
                      key={opt.value}
                      className="flex items-center space-x-2 mb-2 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="gender"
                        value={opt.value}
                        checked={localFilters.gender === opt.value}
                        onChange={(e) => setSingle("gender", e.target.value)}
                        className="size-4.5 ml-3"
                      />
                      <span className="text-base leading-6 font-normal text-[#0C0D06]">
                        {opt.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 w-full bg-white border-t border-[#DADAD9] px-6 py-4 flex gap-3">
              <button
                onClick={applyClearedFilters}
                className="flex-1 border border-[#0C0D06] text-sm rounded-[12px] py-3 text-[#0C0D06]"
              >
                {t("allClear")}
              </button>
              <button
                onClick={() => {
                  pushUrlFromLocal();
                  setIsFilterModalOpen(false);
                }}
                className="flex-1 bg-(--reddishPurple) text-white text-sm rounded-[12px] py-3"
              >
                {t("showResults") || "Show Results"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default SportsFilters;