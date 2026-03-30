"use client";
import React from "react";
import IconsLibrary from "@/util/IconsLibrary";

/**
 * Horizontal steps progress indicator used in onboarding.
 * @param {Object} props
 * @param {Array<{step:number}>} [props.steps=[]]
 * @param {number} [props.currentIndex=0] Zero-based active index
 */
const StepsProgress = ({ steps = [], currentIndex = 0 }) => {
  if (!Array.isArray(steps) || steps.length === 0) return null;
  return (
    <div className="w-full flex gap-0 items-center mt-[28px] mb-8 lg:mt-[48px]">
      {steps.map((i, index) => {
        const isActiveStep = currentIndex === index;
        return (
          <React.Fragment key={index}>
            <div className={`min-w-8 min-h-8 justify-center items-center flex rounded-full border border-[#0C0D0626] `}>
              {isActiveStep ? <IconsLibrary name={"stepDone"} /> : i.step}
            </div>
            <span
              className={`block w-full h-[1px] bg-[#0C0D0626] ${index === steps.length - 1 ? "hidden" : ""}`}
            />
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default StepsProgress;
