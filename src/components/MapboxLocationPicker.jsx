"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { AsyncPaginate } from "react-select-async-paginate";

const MapboxLocationPicker = ({ value, onChange, isFilter = false }) => {
  const [countries, setCountries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const t = useTranslations("Mapbox");

  // Fetch countries from REST Countries API
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          "https://restcountries.com/v3.1/all?fields=name,cca2,capitalInfo,latlng"
        );

        if (!response.ok) {
          throw new Error("Failed to fetch countries");
        }

        const data = await response.json();

        // Transform the data to match our expected format
        const transformedCountries = data
          .map((country) => ({
            name: country.name.common,
            code: country.cca2,
            coordinates: country.capitalInfo?.latlng ||
              country.latlng || [0, 0],
          }))
          .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically

        setCountries(transformedCountries);
        setError(null);
      } catch (err) {
        console.error("Error fetching countries:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCountries();
  }, []);

  // Helper to convert to react-select option
  const toOption = useCallback(
    (country) => ({
      label: country.name,
      value: country.code,
      data: country,
    }),
    []
  );

  // Build the controlled value for AsyncPaginate from incoming prop
  const selectedOption = value?.locationName
    ? toOption({
        name: value.locationName,
        code: value.countryCode || value.locationName,
        coordinates:
          value.coordinates ||
          value?.geometry?.coordinates ||
          value?.coords ||
          [],
      })
    : null;

  // Paginated loader (local pagination over fetched list)
  const loadOptions = useCallback(
    async (inputValue, loadedOptions, { page }) => {
      const pageSize = 30;
      const normalizedQuery = (inputValue || "").toLowerCase();

      // Filter locally by name
      const filtered = countries.filter((c) =>
        c.name.toLowerCase().includes(normalizedQuery)
      );

      const currentPage = page || 1;
      const start = (currentPage - 1) * pageSize;
      const end = start + pageSize;
      const slice = filtered.slice(start, end).map(toOption);

      return {
        options: slice,
        hasMore: end < filtered.length,
        additional: {
          page: currentPage + 1,
        },
      };
    },
    [countries, toOption]
  );

  const handleChange = (option) => {
    if (!option) {
      onChange(null);
      return;
    }
    const country = option.data;
    onChange({
      type: "Point",
      coordinates: country.coordinates,
      locationName: country.name,
      countryCode: country.code,
    });
  };

  // Show loading state
  // if (isLoading) {
  //   return (
  //     <div className="mt-4 relative">
  //       <div className="w-full pr-3 py-3 border border-[#0C0D06] rounded-[12px] bg-[#F3F3F2] flex items-center justify-center">
  //         <Loader />
  //         <span className="ml-2 text-gray-500">{t("loading")}</span>
  //       </div>
  //     </div>
  //   );
  // }

  // Show error state
  if (error) {
    return (
      <div className="mt-4 relative">
        <div className="w-full pr-3 py-3 border border-red-300 rounded-[12px] bg-red-50 text-red-600 text-center">
          {t("error")}: {error}
        </div>
      </div>
    );
  }

  return (
    <div className={`${isFilter ? 'mt-4' : 'mt-4'} relative`}>
      <AsyncPaginate
        value={selectedOption}
        loadOptions={loadOptions}
        onChange={handleChange}
        additional={{ page: 1 }}
        isClearable
        isDisabled={isLoading}
        placeholder={t("placeholder")}
        classNamePrefix="country-select"
        className={`country-select-container w-full ${isFilter ? "" : ""}`}
        menuPortalTarget={typeof window !== "undefined" ? document.body : null}
        styles={{
          control: (base, state) => ({
            ...base,
            minHeight: isFilter ? 40 : 48,
            borderRadius: 12,
            backgroundColor: "#F3F3F2",
            borderColor: "#0C0D06",
            boxShadow: state.isFocused ? "0 0 0 1px #0C0D06" : base.boxShadow,
            paddingLeft: isFilter ? 12 : 48,
          }),
          placeholder: (base) => ({ ...base, color: "#6B7280" }),
          input: (base) => ({ ...base, color: "#374151" }),
          singleValue: (base) => ({ ...base, color: "#374151" }),
          menu: (base) => ({ ...base, zIndex: 9999 }),
          menuPortal: (base) => ({ ...base, zIndex: 9999 }),
          dropdownIndicator: (base, state) => ({
            ...base,
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
          indicatorSeparator: () => ({
            display: "none",
          }),
          clearIndicator: () => ({
            display: "none",
          }),
        }}
      />
    </div>
  );
};

export default MapboxLocationPicker;
