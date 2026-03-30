"use client";
import React, { useMemo } from "react";
import moment from "moment/moment";
import Section from "@/components/ViewCampaign/Section";
import AssetSection from "@/components/ViewCampaign/AssetSection";

/**
 * Campaign details view: description, category, compensation, regions, content, status, assets.
 * @param {Object} props
 * @param {any} props.details
 * @param {(key: string) => string} props.t
 * @param {(key: string) => string} props.t1
 * @param {(type: string) => string} props.translateCompensation
 * @param {string} props.userRole
 */
const CampaignDetails = ({ details, t, t1, translateCompensation, userRole }) => {
  const hasStyleGuideValues = useMemo(() => {
    return Object.values(details.assets?.styleGuide || {}).some(
      (val) => val !== ""
    );
  }, [details.assets?.styleGuide]);

  const category = [
    { key: t1("step1.category.Apparel"), value: "apparel" },
    { key: t1("step1.category.Technology"), value: "technology" },
    { key: t1("step1.category.Nutrition"), value: "nutrition" },
    { key: t1("step1.category.Wellness"), value: "wellness" },
    { key: t1("step1.category.Footwear"), value: "footwear" },
    { key: t1("step1.category.Services"), value: "services" },
    { key: t1("step1.category.Media"), value: "media_content" },
    { key: t1("step1.category.Outdoor"), value: "outdoor_adventure_gear" },
    { key: t1("step1.category.Events"), value: "events_experiences" },
    { key: t1("step1.category.Accessories"), value: "accessories_equipment" },
    { key: t1("step1.category.Other"), value: "other" },
  ];

  const regionOptions = [
    { value: "north_america", label: t1("regionOptions.North") },
    { value: "europe", label: t1("regionOptions.Europe") },
    { value: "asia", label: t1("regionOptions.Asia") },
    { value: "africa", label: t1("regionOptions.Africa") },
    { value: "south_america", label: t1("regionOptions.South") },
    { value: "australia", label: t1("regionOptions.Australia") },
  ];
  
  return (
    <>
      {details && details?.brandId?._id && userRole !== "sports-ambassador" && (
        <Section title="">
          <p className="font-bold text-xl">{details.basics.title}</p>
        </Section>
      )}
      <Section title="">
        <p className="whitespace-pre-wrap">{details.basics.description}</p>
      </Section>
      <Section title={t("category")}>
        <p>
          {category.find((c) => c.value === details.basics.category)?.key ??
            details.basics.category}
        </p>
      </Section>

      <Section title={t("compensation")}>
        <p className="capitalize">
          {translateCompensation(details.compensation.type)}
        </p>
        <>
          {details.compensation.type === "pay-per-sale" ? (
            <p>
              {t("commission")}: {details.compensation.commission}%
            </p>
          ) : (
            <p>
              {t("flat")} €{details.compensation.amount}
            </p>
          )}
          <p>
            {t("duration")}: {details.compensation.duration} {t("days")}
          </p>
        </>
      </Section>

      {details.basics.targetRegions?.length > 0 && (
        <Section title={t("target")}>
          <p>
            {details.basics.targetRegions
              .map(
                (val) =>
                  regionOptions.find((r) => r.value === val)?.label ?? val
              )
              .join(", ")}
          </p>
        </Section>
      )}

      <Section title={t("content")}>
        <p className="whitespace-pre-wrap">{details.creatorProfile.contentRequirements}</p>
      </Section>
      {details.basics.isOngoing ? (
        <Section title={t("status")}>
          <p>{t("going")}</p>
        </Section>
      ) : (
        <Section title={t("endDate")}>
          <p>{moment(details.basics.endDate).format("LLL")}</p>
        </Section>
      )}
      {details?.compensation?.gifting && (
        <div className="text-sm font-bold">{t("gift")}</div>
      )}

      {hasStyleGuideValues && (
        <Section title={t("styleGuides")}>
          {details.assets.styleGuide.fonts?.length > 0 && (
            <p title={details.assets.styleGuide.fonts}>
              <b>{t("fonts")}</b>
              {details.assets.styleGuide.fonts.length > 50
                ? details.assets.styleGuide.fonts.slice(0, 50) + "..."
                : details.assets.styleGuide.fonts}
            </p>
          )}
          {details.assets.styleGuide.colors?.length > 0 && (
            <p title={details.assets.styleGuide.colors}>
              <b>{t("colors")}</b>
              {details.assets.styleGuide.colors.length > 50
                ? details.assets.styleGuide.colors.slice(0, 50) + "..."
                : details.assets.styleGuide.colors}
            </p>
          )}
          {details.assets.styleGuide.guidelines?.length > 0 && (
            <p title={details.assets.styleGuide.guidelines}>
              <b>{t("guidelines")}</b>
              {details.assets.styleGuide.guidelines}
            </p>
          )}
        </Section>
      )}

      <div className="space-y-8">
        {(details?.assets?.photos?.length > 0 ||
          details?.assets?.videos?.length > 0 ||
          details?.assets?.examplePosts?.length > 0 ||
          details?.basics?.coverImages?.length > 0) && (
          <h3 className="text-xl font-bold">{t("assets")}</h3>
        )}
        {details.basics?.coverImages?.length > 0 && (
          <AssetSection title={t("logo")} items={details.basics.coverImages} />
        )}
        {details.assets.photos?.length > 0 && (
          <AssetSection title={t("pics")} items={details.assets.photos} />
        )}
        {details.assets.videos?.length > 0 && (
          <AssetSection
            title={t("videos")}
            items={details.assets.videos}
            isVideo
          />
        )}
        {details.assets.examplePosts?.length > 0 && (
          <AssetSection
            title={t("posts")}
            items={details.assets.examplePosts}
            isMixed
          />
        )}
      </div>
    </>
  );
};

export default CampaignDetails;
