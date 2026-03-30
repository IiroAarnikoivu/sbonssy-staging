"use client";

import IconsLibrary from "@/util/IconsLibrary";
import { useState } from "react";

export default function CustomDropdown({
  options,
  value,
  onChange,
  placeholder,
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (selectedValue) => {
    onChange(selectedValue);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full">
      {/* Dropdown trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="bg-[#0c0d060d] rounded-xl relative text-base max-h-[48px] px-4 py-3 cursor-pointer w-full"
      >
        {value
          ? options.find((opt) => opt.value === value)?.label
          : placeholder}

        <div className="absolute right-5 top-[21px]">
          <IconsLibrary
            styling={`${
              isOpen ? "scale-y-[-1]" : ""
            } transition-all duration-300`}
            name="customDropdown"
          />
        </div>
      </div>

      {/* Options */}
      {isOpen && (
        <ul className="absolute z-10 bg-white border border-gray-200 mt-1 rounded w-full shadow">
          {options.map((option) => (
            <li
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
