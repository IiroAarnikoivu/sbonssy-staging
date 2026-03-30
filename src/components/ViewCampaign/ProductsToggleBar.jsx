"use client";
import React from "react";

/**
 * Toggle bar to switch between campaign details and products view.
 * @param {Object} props
 * @param {boolean} [props.hasProducts=false]
 * @param {string} [props.userRole=""]
 * @param {"loading"|"joined"|"pending"|"not_applied"} [props.buttonStatus="not_applied"]
 * @param {boolean} [props.showProductsOnly=false]
 * @param {() => void} [props.onToggle=() => {}]
 * @param {(key: string) => string} props.t
 */
const ProductsToggleBar = ({
  hasProducts = false,
  userRole = "",
  buttonStatus = "not_applied",
  showProductsOnly = false,
  onToggle = () => {},
  t,
}) => {
  if (!hasProducts) return null;
  return (
    <div className="flex gap-3 lg:mb-6 justify-center items-center md:justify-start md:items-center w-full sm:w-fit">
      <button
        style={
          userRole === "sports-ambassador" && buttonStatus === "joined"
            ? { padding: "10px 15px" }
            : { padding: "10px 15px" }
        }
        onClick={onToggle}
        className="primaryBtnPlain text-white mx-auto md:mx-0 px-5 xl:w-full w-full lg:max-w-[240px]"
      >
        {showProductsOnly
          ? t("view")
          : `${
              buttonStatus === "joined" ? t("addProducts") : t("showProducts")
            }`}
      </button>
    </div>
  );
};

export default ProductsToggleBar;
