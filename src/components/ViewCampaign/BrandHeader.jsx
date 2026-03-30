"use client";
import React from "react";
import Image from "next/image";
import IconsLibrary from "@/util/IconsLibrary";

/**
 * Brand header section with logo, favorite toggle, message and share controls.
 * @param {Object} props
 * @param {{role?: string}} [props.user]
 * @param {boolean} [props.isFavorite=false]
 * @param {() => void} [props.onToggleFavorite=() => {}]
 * @param {string} [props.logoUrl=""]
 * @param {string} [props.brandName=""]
 * @param {boolean} [props.canCreateShare=false]
 * @param {() => void} [props.onCreateShare=() => {}]
 * @param {boolean} [props.createShareLoading=false]
 * @param {() => void} [props.onOpenMessage=() => {}]
 * @param {(key: string) => string} props.t
 */
const BrandHeader = ({
  user = {},
  isFavorite = false,
  onToggleFavorite = () => {},
  logoUrl = "",
  brandName = "",
  canCreateShare = false,
  onCreateShare = () => {},
  createShareLoading = false,
  onOpenMessage = () => {},
  t,
}) => {
  return (
    <div className="flex flex-col w-full lg:w-fit md:w-[340px] mx-auto align-center lg:align-start">
      <div className="relative w-fit md:max-w-[400px] mx-auto mb-4 lg:mx-0">
        {user?.role === "sports-ambassador" ? (
          <button
            onClick={(e) => {
              e.preventDefault();
              onToggleFavorite();
            }}
            className="absolute top-4 left-4 z-10 text-2xl"
          >
            {isFavorite ? (
              <IconsLibrary name={"star_profile_filled"} />
            ) : (
              <IconsLibrary name={"star_profile"} />
            )}
          </button>
        ) : null}

        <Image
          src={logoUrl}
          alt="Brand logo"
          priority
          width={400}
          height={400}
          className="w-full aspect-square max-w-[250px] md:max-w-[300px] lg:max-w-[280px] object-cover"
        />
      </div>

      <div className="w-full lg:p-4 flex flex-col justify-center gap-4">
        <h2 className="text-[24px] lg:text-[40px] leading-[100%] text-center">
          {brandName}
        </h2>
        {user?.role === "sports-ambassador" && (
          <button
            className="primaryBtnPlain w-full lg:max-w-[240px] mx-auto text-white disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onOpenMessage}
          >
            {t("msg")}
          </button>
        )}

        {/* {user?.role === "sports-ambassador" && canCreateShare && (
          <button
            onClick={onCreateShare}
            disabled={createShareLoading}
            className="primaryBtnPlain w-full max-w-[280px] mx-auto md:mx-0 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createShareLoading ? t("creating") : t("create")}
          </button>
        )} */}
      </div>
    </div>
  );
};

export default BrandHeader;
