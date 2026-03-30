"use client";
import React from "react";

/**
 * Brand-only button to open ambassador selection modal.
 * @param {Object} props
 * @param {() => void} [props.onClick=() => {}]
 * @param {(key: string) => string} props.t
 * @param {string} [props.userRole=""]
 */
const AmbassadorSelectButton = ({ onClick = () => {}, t, userRole = "" }) => {
  if (userRole === "sports-ambassador") return null;
  return (
    <button
      onClick={onClick}
      className="w-full bg-[#F9FD99] text-[#0C0D06] rounded-full h-10 px-6 text-base leading-6 whitespace-nowrap flex items-center justify-center transition duration-200 hover:bg-yellow-300 lg:w-fit "
    >
      {t("selectAmbassador")}
    </button>
  );
};

export default AmbassadorSelectButton;
