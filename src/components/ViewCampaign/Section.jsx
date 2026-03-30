"use client";
import React from "react";

/**
 * Generic titled section wrapper.
 * @param {Object} props
 * @param {string} [props.title=""]
 * @param {React.ReactNode} [props.children=null]
 */
const Section = ({ title = "", children = null }) => (
  <div className="mb-6">
    <h4 className="font-bold text-base mb-2">{title}</h4>
    <div
      className={`text-base text-[#0C0D06] ${
        title === "Campaign Title" ? "mt-5" : null
      }`}
    >
      {children}
    </div>
  </div>
);

export default Section;
