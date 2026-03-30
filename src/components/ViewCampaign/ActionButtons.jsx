"use client";
import React from "react";

/**
 * Primary and secondary action buttons for campaign interactions.
 * @param {Object} props
 * @param {"loading"|"joined"|"pending"|"not_applied"} props.buttonStatus
 * @param {(key: string) => string} props.t
 * @param {() => void} [props.onPrimaryClick=() => {}]
 * @param {() => void} [props.onSecondaryClick=() => {}]
 * @param {string} props.primaryLabel
 * @param {string} [props.secondaryLabel=""]
 */
const ActionButtons = ({
  buttonStatus,
  t,
  onPrimaryClick = () => {},
  onSecondaryClick = () => {},
  primaryLabel,
  secondaryLabel = "",
}) => {
  return (
    <>
      {buttonStatus !== "joined" && (
        <button
          className={`primaryBtnPlain h-fit ${
            buttonStatus === "loading"
              ? "bg-orange-500 cursor-not-allowed"
              : "bg-orange-500 hover:bg-orange-600"
          } text-white transition-colors`}
          onClick={onPrimaryClick}
          disabled={buttonStatus === "loading"}
        >
          {primaryLabel}
        </button>
      )}
      {buttonStatus === "joined" && (
        <button
          className={`primaryBtnPlain h-fit text-white mx-auto md:mx-0 lg:secondaryBtnGray px-5 w-full lg:max-w-[240px] transition-colors`}
          onClick={onSecondaryClick}
        >
          {secondaryLabel}
        </button>
      )}
    </>
  );
};

export default ActionButtons;
