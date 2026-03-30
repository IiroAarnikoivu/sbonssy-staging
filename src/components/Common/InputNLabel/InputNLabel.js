"use client";
import React from "react";
import IconsLibrary from "@/util/IconsLibrary";
import dynamic from "next/dynamic";
import DropdownIndicator from "@/components/DropdownIndicator";

const Select = dynamic(() => import("react-select"), { ssr: false });

const MapboxLocationPicker = dynamic(
  () => import("@/components/MapboxLocationPicker"),
  { ssr: false }
);
export default function InputNLabel({
  label,
  placeholder,
  style,
  inputType = "text",
  name,
  value,
  onChange,
  onBlur,
  error,
  isLocationPicker = false,
}) {
  return (
    <div>
      <label className="text-base font-normal leading-[150%]">{label}</label>
      {isLocationPicker ? (
        <>
          <MapboxLocationPicker
            value={
              value || { type: "Point", coordinates: [], locationName: "" }
            } // Enforce object
            onChange={(val) => {
              // Normalize val to object
              const locationValue =
                typeof val === "string"
                  ? { type: "Point", coordinates: [], locationName: val } // Fallback for string
                  : val || { type: "Point", coordinates: [], locationName: "" }; // Use object or default
              onChange(locationValue);
              onBlur?.();
            }}
            isFilter={true}
            className={`w-full rounded-2xl min-h-[48px] p-4 leading-[150%] bg-[#0C0D060D] active:outline-0 focus-visible:outline-0 focus:outline-0 mt-2 ${
              error ? "border border-red-500" : ""
            }`}
            placeholder={placeholder || `Select ${label}`}
          />
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </>
      ) : (
        <>
          <input
            type={inputType}
            name={name}
            value={value || ""}
            onChange={onChange}
            onBlur={onBlur}
            className={`${
              style || ""
            } w-full rounded-2xl min-h-[48px] p-4 leading-[150%] bg-[#0C0D060D] active:outline-0 focus-visible:outline-0 focus:outline-0 mt-2 ${
              error ? "border border-red-500" : ""
            }`}
            placeholder={placeholder}
          />
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </>
      )}
    </div>
  );
}

export function TextareaNlabel({
  label,
  name,
  value,
  onChange,
  onBlur,
  error,
}) {
  return (
    <div>
      <label className="text-base font-normal leading-[150%]">{label}</label>
      <textarea
        name={name}
        value={value || ""}
        onChange={onChange}
        onBlur={onBlur}
        className={`w-full block min-h-[147px] rounded-2xl p-4 bg-[#0C0D060D] active:outline-0 focus-visible:outline-0 focus:outline-0 mt-2 ${
          error ? "border border-red-500" : ""
        }`}
      ></textarea>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}

export function SelectOptionNlabel({
  label,
  name,
  options = [],
  value,
  onChange,
  onBlur,
  error,
  isMulti = false,
  hasGroups = false,
  placeholder,
  closeMenuOnSelect = false,
}) {
  // Ensure options are properly formatted
  const formatOptions = (opts) => {
    if (hasGroups) {
      return opts; // Assume groups are already properly formatted
    }
    return opts.map((option) =>
      typeof option === "object" ? option : { label: option, value: option }
    );
  };

  const formattedOptions = formatOptions(options);

  const handleSelectChange = (selectedOption) => {
    if (isMulti) {
      onChange(selectedOption || []);
    } else {
      onChange(selectedOption || null);
    }
  };

  return (
    <div className="customSelectDesign relative">
      <label className="block mb-2 mt-6">{label}</label>
      {isMulti ? (
        <>
          <Select
            isMulti
            name={name}
            options={formattedOptions}
            placeholder={placeholder || `Select ${label}`}
            closeMenuOnSelect={closeMenuOnSelect}
            value={value}
            onChange={handleSelectChange}
            onBlur={onBlur}
            className={`${error ? "border border-red-500" : ""}`}
            classNamePrefix="react-select"
            styles={{
              indicatorSeparator: () => ({
                display: "none",
              }),
            }}
            components={{ DropdownIndicator }}
          />
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </>
      ) : (
        <div className="relative w-full">
          <Select
            name={name}
            options={formattedOptions}
            placeholder={placeholder || `Select ${label}`}
            value={value}
            onChange={handleSelectChange}
            onBlur={onBlur}
            className={`${error ? "border border-red-500" : ""}`}
            classNamePrefix="react-select"
            styles={{
              indicatorSeparator: () => ({
                display: "none",
              }),
            }}
            components={{ DropdownIndicator }}
          />
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
      )}
    </div>
  );
}

export function SelectOptionNlabelAndValue({
  label,
  name,
  options = [], // Default to empty array if undefined
  value,
  onChange,
  onBlur,
  error,
  isMulti = false,
  hasGroups = false,
  placeholder,
  closeMenuOnSelect = false,
}) {
  // Ensure options is always an array
  const safeOptions = Array.isArray(options) ? options : [];

  return (
    <div className="customSelectDesign relative">
      <label className="block mb-2 mt-6">{label}</label>
      {isMulti && (
        <>
          <Select
            isMulti
            name={name}
            options={hasGroups ? safeOptions : safeOptions}
            placeholder={placeholder || `Select ${label}`}
            closeMenuOnSelect={closeMenuOnSelect}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            className={`${error ? "border border-red-500" : ""}`}
            classNamePrefix="react-select"
            styles={{
              indicatorSeparator: () => ({
                display: "none", // Removes the separator
              }),
            }}
            components={{ DropdownIndicator }}
          />
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </>
      )}
    </div>
  );
}
export function UploadFileNlabel({
  label,
  name,
  onChange,
  error,
  value,
  onRemove,
}) {
  return (
    <div>
      <label>{label}</label>
      <div className="relative w-fit h-fit mt-4">
        <label className="block w-[202px] h-[202px] rounded-2xl bg-[#0C0D060D] bg-center bg-cover overflow-hidden cursor-pointer">
          {value && (
            <img
              src={value}
              alt="Company logo"
              className="w-full h-full object-cover"
            />
          )}
          <input
            type="file"
            className="hidden"
            onChange={onChange}
            accept="image/*"
          />
          {!value && (
            <div className="w-full h-full flex items-center justify-center">
              <span>Upload logo</span>
            </div>
          )}
        </label>
        {value && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
            aria-label="Remove image"
          >
            ×
          </button>
        )}
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}

export function RadioBtnNlabel({ label, name, data, value, onChange, error }) {
  return (
    <div className="">
      <label>{label}</label>
      <div className="flex items-center gap-4 flex-wrap mt-4">
        {data.map((item, index) => {
          return (
            <div key={index} className="mt-4 radioBtnWrapper text-nowrap">
              <label htmlFor={`${name}-${index}`}>
                <input
                  type="radio"
                  name={name}
                  id={`${name}-${index}`}
                  className="hidden"
                  value={item.value}
                  checked={value === item.value}
                  onChange={onChange}
                />
                <span className={value === item ? "active" : ""}>
                  {item.label}
                </span>
              </label>
            </div>
          );
        })}
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}
