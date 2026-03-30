"use client";
import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { getCurrentLocation } from "@/lib/geolocation";
import dynamic from "next/dynamic";

// Disable SSR for MapboxLocationPicker to prevent hydration mismatches
const MapboxLocationPicker = dynamic(() => import("./MapboxLocationPicker"), {
  ssr: false,
});

const LocationSearch = ({
  value,
  onChange,
  onLocationSelect,
  placeholder = "Search location...",
  className = "",
}) => {
  const t = useTranslations("MarketPlace");
  const [locationData, setLocationData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize location data from value
  useEffect(() => {
    if (value) {
      setLocationData({
        locationName: value,
        type: "Point",
        coordinates: locationData?.coordinates || null,
      });
    } else {
      // Clear location data when value is empty
      setLocationData(null);
    }
  }, [value]);

  const handleLocationChange = (newLocationData) => {
    setLocationData(newLocationData);

    if (newLocationData) {
      // Extract coordinates - MapboxLocationPicker returns [lng, lat]
      const lng = newLocationData.coordinates[0];
      const lat = newLocationData.coordinates[1];

      onChange?.(newLocationData.locationName);
      onLocationSelect?.({
        name: newLocationData.locationName,
        lat: lat,
        lng: lng,
      });
    } else {
      onChange?.("");
      onLocationSelect?.(null);
    }
  };

  const handleClearLocation = () => {
    handleLocationChange(null);
  };

  return (
    <div className={`relative ${className}`}>
      {/* <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
              fill="#0C0D06"
            />
          </svg>
        </span> */}

      <div className="relative">
        <MapboxLocationPicker
          value={locationData}
          onChange={handleLocationChange}
          isFilter={true}
        />
      </div>
    </div>
  );
};

export default LocationSearch;
