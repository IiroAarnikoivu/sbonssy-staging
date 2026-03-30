"use client";

import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { buildAmbassadorSlug, toSlug } from "@/util/buildAmbassadorSlug";
import { resolveAmbassadorSlug } from "@/util/resolveAmbassadorSlug";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import "swiper/css";
import "swiper/css/pagination";
import { Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import Swal from "sweetalert2";
import ProfileTile from "./ProfileTile";
import AccountCard from "./AccountCard";
import CampaignSlide from "./slides/CampaignSlide";
import AmbassadorSlide from "./slides/AmbassadorSlide";
import FavouriteSlide from "./slides/FavouriteSlide";
import {
  getAmbassadorDisplay,
  getCampaignCover,
  getShopifyTargetUrl,
} from "./utils";

export default function Dashboard({ role = "", isConnectingShopify }) {
  const { user } = useAuthStore();
  const { shouldShowStripeReminder, dismissStripeReminder } = useUIStore();
  const t = useTranslations("Dashboard");
  const tBrand = useTranslations("Brand.campaignsPage");
  const toastAlert = useTranslations("Sweetalert");
  const router = useRouter();
  // Consolidated state to reduce re-renders and keep data organized
  const [state, setState] = useState({
    campaigns: [],
    ambassadors: [],
    loading: false,
    error: "",
    joinedCampaigns: [],
    latestCampaigns: [],
    fanAmbassadors: [],
    fanCampaigns: [],
    fanFavourites: [],
    shopifyUrl: "",
    storeNameInput: "",
    storeNameError: "",
    storeModalOpen: false,
    analytics: null,
    analyticsLoading: false,
    dateRange: "30days",
    dateRangeDropdownOpen: false,
  });

  // Track token generation loading state
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);

  // Track Stripe setup reminder modal
  const [showStripeReminderModal, setShowStripeReminderModal] = useState(false);

  // Determine the brandId honoring invited brand linkage
  const brandId = useMemo(() => {
    const details = user?.onboardedDetails;
    if (!details) return null;
    return details.invitedBy ? String(details.invitedBy) : String(details._id);
  }, [user]);

  // Compute current user's profile image based on role/subrole
  const profileImage = useMemo(() => {
    const details = user?.onboardedDetails || {};
    const r = details?.role || role;
    if (r === "brand") {
      return details?.brand?.companyLogo || "/assets/images/whoisthis.png";
    }
    if (r === "sports-ambassador") {
      return (
        details?.athlete?.images?.[0]?.url ||
        details?.team?.images?.[0]?.url ||
        details?.influencer?.images?.[0]?.url ||
        details?.coach?.images?.[0]?.url ||
        details?.exAthlete?.images?.[0]?.url ||
        details?.paraAthlete?.images?.[0]?.url ||
        details?.images?.[0]?.url ||
        "/assets/images/whoisthis.png"
      );
    }
    return "/assets/images/whoisthis.png";
  }, [user, role]);

  // Whether brand has connected Shopify (use inviter's connection if invited)
  const brandOwnerShopifyDetails = useMemo(() => {
    const invitedBy = user?.onboardedDetails?.invitedBy;
    const owner =
      invitedBy && invitedBy.brand ? invitedBy : user?.onboardedDetails;
    return owner?.brand?.shopifyDetails;
  }, [user]);

  const isShopifyConnected = useMemo(() => {
    return !!brandOwnerShopifyDetails;
  }, [brandOwnerShopifyDetails]);

  const sanitizeStoreName = (value = "") => {
    const trimmed = value.trim();
    if (!trimmed) return "";
    // Remove protocol and trailing path/query if user pasted a full URL
    const withoutProto = trimmed.replace(/^https?:\/\//i, "");
    const withoutDomain = withoutProto.replace(/\.myshopify\.com/i, "");
    return withoutDomain.split(/[/?#]/)[0].toLowerCase();
  };

  const buildOutboundShopifyUrl = () => {
    const appName = process.env.NEXT_PUBLIC_SHOPIFY_APP_NAME;
    const storeSlug = sanitizeStoreName(state.storeNameInput);

    if (!storeSlug) {
      setState((s) => ({
        ...s,
        storeNameError: t("storeNameError"),
      }));
      return null;
    }

    if (!appName) {
      setState((s) => ({
        ...s,
        storeNameError: t("shopifyConfigError"),
      }));
      return null;
    }

    setState((s) => ({ ...s, storeNameError: "" }));
    return `https://admin.shopify.com/store/${storeSlug}/apps/${appName}/app`;
  };

  const handleShopifyNavigate = (preferSigned = false) => {
    const openNewTab = (url) =>
      window.open(url, "_blank", "noopener,noreferrer");

    if (isShopifyConnected) {
      const targetUrl = getShopifyTargetUrl(
        user,
        state.shopifyUrl,
        preferSigned,
      );
      if (targetUrl) openNewTab(targetUrl);
      return;
    }

    const outboundUrl = buildOutboundShopifyUrl();
    if (outboundUrl) {
      setState((s) => ({ ...s, storeModalOpen: false }));
      openNewTab(outboundUrl);
    }
  };

  const openStoreModal = () =>
    setState((s) => ({ ...s, storeModalOpen: true, storeNameError: "" }));
  const closeStoreModal = () =>
    setState((s) => ({ ...s, storeModalOpen: false, storeNameError: "" }));

  const handleCreateCampaign = async () => {
    try {
      const response = await api.get("/payments/payment-methods");
      const paymentMethods = response.data.data;
      if (!paymentMethods || paymentMethods.length === 0) {
        await Swal.fire({
          title: toastAlert("noMethod"),
          text: toastAlert("reqMsg"),
          icon: "warning",
          confirmButtonText: tBrand("addPaymentMethod", "Add Payment Method"),
          showCancelButton: true,
          cancelButtonText: toastAlert("cancel"),
          customClass: {
            confirmButton: "confirmButton",
            cancelButton: "cancelButton",
          },
        }).then((result) => {
          if (result.isConfirmed) {
            router.push(`/brand/settings/payments`);
          }
        });
      } else {
        router.push("/brand/campaign/create");
      }
    } catch (error) {
      console.error("Error checking payment methods:", error);
      await Swal.fire({
        title: toastAlert("methodFailed"),
        text: toastAlert("methodError"),
        icon: "error",
        toast: true,
        position: "top-right",
        showConfirmButton: false,
        timerProgressBar: false,
        timer: 3000,
      });
    }
  };

  // Role-specific welcome text
  const welcomeText = useMemo(() => {
    if (role === "fan") return t("welcomeFan");
    if (role === "brand") return t("welcomeBrand");
    if (role === "sports-ambassador") return t("welcomeAmbassador");
    return t("welcomeDefault");
  }, [role, t]);

  // Build Shopify token URL for brand card
  useEffect(() => {
    const buildShopifyUrl = async () => {
      if (role !== "brand") return;
      try {
        const shopifyDetails = brandOwnerShopifyDetails;
        const shopName = shopifyDetails?.myShopifyDomain?.split(".")?.[0];
        const appName = process.env.NEXT_PUBLIC_SHOPIFY_APP_NAME;
        if (!shopName || !appName) {
          setState((s) => ({ ...s, shopifyUrl: "" }));
          return;
        }
        setIsGeneratingToken(true);
        const response = await api.get("/shopify/generate-token");
        const { hasToken, data: token } = response || {};
        if (hasToken && token) {
          const url = `https://admin.shopify.com/store/${shopName}/apps/${appName}/app?token=${token}`;
          setState((s) => ({ ...s, shopifyUrl: url }));
        } else {
          setState((s) => ({ ...s, shopifyUrl: "" }));
        }
      } catch (e) {
        setState((s) => ({ ...s, shopifyUrl: "" }));
      } finally {
        setIsGeneratingToken(false);
      }
    };
    buildShopifyUrl();
  }, [role, brandOwnerShopifyDetails]);

  useEffect(() => {
    const fetchData = async () => {
      setState((s) => ({ ...s, loading: true, error: "" }));
      try {
        if (role === "brand") {
          if (!brandId) return;
          // Concurrent fetching for brand data
          const [campaignsRes, ambassadorsRes] = await Promise.all([
            api.get(`/campaign?brandId=${encodeURIComponent(brandId)}&limit=3&sort=latest&page=1`),
            api.get(`/brand/sports-ambassador?limit=3&page=1`)
          ]);
          
          setState((s) => ({
            ...s,
            campaigns: campaignsRes?.data || [],
            ambassadors: ambassadorsRes?.data || [],
          }));
        } else if (role === "sports-ambassador") {
          // Concurrent fetching for ambassador data
          const [joinedRes, latestRes] = await Promise.all([
            api.get(`/campaign/joined?limit=3&page=1`),
            api.get(`/campaign?limit=3&sort=latest&page=1`)
          ]);

          setState((s) => ({
            ...s,
            joinedCampaigns: joinedRes?.data?.data || [],
            latestCampaigns: latestRes?.data || [],
          }));
        } else if (role === "fan") {
          // Concurrent fetching for fan data
          const [ambRes, latestRes, favRes] = await Promise.all([
            api.get(`/brand/sports-ambassador?limit=3&page=1`),
            api.get(`/campaign?limit=3&sort=latest&page=1`),
            api.get(`/favourites?limit=0`)
          ]);

          const ambs = ambRes?.data || [];
          const latest = latestRes?.data || [];
          const favData = favRes?.data || {};
          const favCampaigns = favData?.campaign?.data || [];
          const favAmbassadors = favData?.ambassador?.data || [];

          // Normalize favourites into a common list and sort by createdAt desc
          const normalized = [
            ...favCampaigns
              .filter((f) => f?.campaignId)
              .map((f) => ({
                type: "campaign",
                createdAt: f?.createdAt ? new Date(f.createdAt).getTime() : 0,
                id: f?.campaignId?._id,
                title: f?.campaignId?.basics?.title,
                description: f?.campaignId?.basics?.description,
                cover:
                  f?.campaignId?.assets?.logos?.[0]?.url ||
                  f?.campaignId?.basics?.coverImages?.[0]?.url ||
                  "/assets/images/whoisthis.png",
              })),
            ...favAmbassadors
              .filter((f) => f?.ambassadorId)
              .map((f) => {
                const a = f?.ambassadorId || {};
                const subRoles = [
                  "athlete",
                  "team",
                  "influencer",
                  "coach",
                  "exAthlete",
                  "paraAthlete",
                ];
                const subRoleKey = subRoles.find((k) => a?.[k]);

                const name = subRoleKey ? a?.[subRoleKey]?.name : a?.email;

                const image = subRoleKey
                  ? a?.[subRoleKey]?.images?.[0]?.url
                  : a?.images?.[0]?.url;
                const trackingKey = subRoleKey
                  ? a?.[subRoleKey]?.tracking_key
                  : a?.tracking_key;

                return {
                  type: "ambassador",
                  createdAt: f?.createdAt ? new Date(f.createdAt).getTime() : 0,
                  id: a?._id,
                  title: name || t("ambassadorLabel"),
                  description: (a?.subRole || "sports-ambassador").toString(),
                  cover: image || "/assets/images/whoisthis.png",
                  subRole: a?.subRole,
                  supabaseId: a?.supabaseId,
                  tracking_key: trackingKey,
                };
              }),
          ]
            .filter(Boolean)
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 3);

          setState((s) => ({
            ...s,
            fanAmbassadors: ambs,
            fanCampaigns: latest,
            fanFavourites: normalized,
          }));
        }
      } catch (e) {
        setState((s) => ({
          ...s,
          error:
            typeof e === "string" ? e : e?.message || t("failedToLoadData"),
        }));
      } finally {
        setState((s) => ({ ...s, loading: false }));
      }
    };
    fetchData();
  }, [role, brandId]);

  // Fetch analytics data for dashboard metrics
  useEffect(() => {
    const fetchAnalytics = async () => {
      if (role !== "brand" && role !== "sports-ambassador") return;

      setState((s) => ({ ...s, analyticsLoading: true }));
      try {
        const endDate = new Date();
        const startDate = new Date();

        switch (state.dateRange) {
          case "week":
            startDate.setDate(startDate.getDate() - 7);
            break;
          case "30days":
            startDate.setDate(startDate.getDate() - 30);
            break;
          case "ytd":
            startDate.setMonth(0, 1);
            break;
          default:
            startDate.setDate(startDate.getDate() - 30);
        }

        const url =
          role === "brand"
            ? `/api/analytics/brand?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
            : `/api/analytics/sports-ambassador?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;

        const response = await fetch(url, {
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) throw new Error("Failed to fetch analytics");

        const result = await response.json();

        setState((s) => ({
          ...s,
          analytics: role === "brand" ? result.overview : result.data,
          analyticsLoading: false,
        }));
      } catch (e) {
        console.error("Error fetching analytics:", e);
        setState((s) => ({ ...s, analyticsLoading: false }));
      }
    };

    fetchAnalytics();
  }, [role, state.dateRange]);

  // Format currency helper
  const formatCurrency = (value) => {
    if (!value || isNaN(value)) return "0€";
    return `${Number(value).toFixed(2)}€`;
  };

  // Format number helper
  const formatNumber = (value) => {
    if (!value || isNaN(value)) return "0";
    return Number(value).toLocaleString();
  };

  // Get date range label for dropdown
  const getDateRangeLabel = () => {
    switch (state.dateRange) {
      case "week":
        return t("lastWeek");
      case "30days":
        return t("last30Days");
      case "ytd":
        return t("yearToDate");
      default:
        return t("last30Days");
    }
  };

  // Get athlete name for welcome message
  const athleteName = useMemo(() => {
    const details = user?.onboardedDetails;
    if (!details) return "";

    const subRoles = ["athlete", "team", "influencer", "coach", "exAthlete", "paraAthlete"];
    const subRoleKey = subRoles.find((k) => details?.[k]);

    return subRoleKey ? details?.[subRoleKey]?.name || details?.email : details?.email || "";
  }, [user]);

  // Get brand name for welcome message
  const brandName = useMemo(() => {
    const details = user?.onboardedDetails;
    if (!details) return "";
    // Try companyName first, then name, then fallback to empty string
    return details?.brand?.companyName || details?.brand?.name || "";
  }, [user]);

  // Check if Stripe is setup for sports-ambassador
  // Uses the same logic as the marketplace visibility check (see /api/all-sports)
  const isStripeSetup = useMemo(() => {
    if (role !== "sports-ambassador") return true;

    const details = user?.onboardedDetails;
    if (!details) return false;

    const subRoles = ["athlete", "team", "influencer", "coach", "exAthlete", "paraAthlete"];
    const subRoleKey = subRoles.find((k) => details?.[k]);

    if (!subRoleKey) return false;

    const stripeAccountId = details[subRoleKey]?.stripeAccountId;

    // Same logic as marketplace: stripeAccountId must exist and not be empty
    return !!(stripeAccountId && stripeAccountId.trim() !== "");
  }, [user, role]);

  // Show Stripe reminder modal on mount for sports-ambassadors without Stripe setup
  // Only show once per day to avoid spam
  useEffect(() => {
    // Wait for user data to fully load before checking Stripe setup
    const userDataLoaded = !!user?.onboardedDetails;

    if (role === "sports-ambassador" && userDataLoaded && !isStripeSetup) {
      if (shouldShowStripeReminder()) {
        // Small delay to ensure page has loaded
        const timer = setTimeout(() => {
          setShowStripeReminderModal(true);
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [role, isStripeSetup, shouldShowStripeReminder, user]);

  // If brand, render new dark-themed dashboard
  if (role === "brand") {
    return (
      <div className="text-white px-4 sm:px-8 lg:px-16 py-12">
        {/* Welcome Message - Mobile */}
        <div className="lg:hidden mb-8 text-left">
          <h2 className="text-2xl font-normal mb-2 tracking-tight">
            {t("welcome")} {brandName}
          </h2>
          <p className="text-white/80 text-base max-w-2xl mb-6">
            {t("welcomeBrand")}
          </p>

          {/* CTA Button - Mobile */}
          <button
            onClick={handleCreateCampaign}
            className="w-full px-8 py-3 bg-[#F26915] text-white rounded-full text-base font-medium hover:bg-[#d95a12] transition-colors"
          >
            {t("createCampaign")}
          </button>

          {/* Shopify Card - Mobile */}
          <div className="mt-6 w-full">
            <AccountCard
              role="brand"
              imageSrc="/assets/shopify-logo-png-transparent.png"
              alt="Shopify"
              onMainClick={() => {
                if (!isShopifyConnected) {
                  openStoreModal();
                  return;
                }
                handleShopifyNavigate(false);
              }}
              isShopifyConnected={isShopifyConnected}
              overlayLabel={isShopifyConnected ? t("shopifyConnected") : t("shopify")}
              ctaLabel={isShopifyConnected ? t("app") : t("connect")}
              onCTA={() => {
                if (!isShopifyConnected) {
                  openStoreModal();
                  return;
                }
                handleShopifyNavigate(isShopifyConnected);
              }}
              isConnecting={isGeneratingToken || isConnectingShopify}
            />
          </div>
        </div>

        {/* Latest Ambassadors Section - Mobile Only */}
        <div className="lg:hidden mb-12">
          <h3 className="text-xl font-normal mb-2">{t("latestAmbassadors")}</h3>
          {state.ambassadors.length > 0 && (
            <div className="flex justify-end mb-4">
              <span
                className="text-xs text-white/60 cursor-pointer hover:text-white transition-colors"
                onClick={() => router.push('/marketplace')}
              >
                {t("viewAll")}
              </span>
            </div>
          )}

          {/* Ambassador Cards Horizontal Scroll */}
          {state.loading ? (
            <div className="text-center py-12 text-white/60">
              {t("loading")}
            </div>
          ) : state.error ? (
            <div className="text-center py-12 text-red-400">
              {state.error}
            </div>
          ) : state.ambassadors.length > 0 ? (
            <div className="overflow-x-auto scrollbar-hide -mx-4 sm:-mx-8 px-4 sm:px-8" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className="flex gap-4 pb-2">
                {state.ambassadors.slice(0, 4).map((a) => {
                  const { name, avatar, subRole } = getAmbassadorDisplay(a, t);
                  return (
                    <div
                      key={a._id}
                      className="flex-shrink-0 w-[calc(50%-0.5rem)] aspect-square rounded-[30px] overflow-hidden cursor-pointer relative group"
                      onClick={() => {
                        const slug = buildAmbassadorSlug(a);
                        if (slug) router.push(`/ambassador/${slug}`);
                        else router.push(`/sports-ambassador-profile/${a?.subRole}/${a?.supabaseId}`);
                      }}
                    >
                      <Image
                        src={avatar}
                        alt={name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="50vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <h4 className="text-white font-semibold text-sm line-clamp-2">
                          {name}
                        </h4>
                        <p className="text-white/80 text-xs capitalize line-clamp-1">
                          {subRole}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-white/60">
              {t("noAmbassadors")}
            </div>
          )}
        </div>

        {/* Top Section - Welcome and Card */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 items-center lg:items-end justify-between mb-12">
          {/* Left - Welcome Message and Analytics */}
          <div className="flex-1 w-full lg:w-auto hidden lg:block">
            <h2 className="text-2xl font-normal mb-2 tracking-tight">
              {t("welcome")} {brandName}
            </h2>
            <p className="text-white/80 text-base max-w-2xl mb-8">
              {t("welcomeBrand")}
            </p>

            {/* CTA Button */}
            <button
              onClick={handleCreateCampaign}
              className="mb-6 px-8 py-3 bg-[#F26915] text-white rounded-full text-base font-medium hover:bg-[#d95a12] transition-colors"
            >
              {t("createCampaign")}
            </button>

            {/* Shopify Card - Desktop */}
            <div className="mb-8 w-full">
              <AccountCard
                role="brand"
                imageSrc="/assets/shopify-logo-png-transparent.png"
                alt="Shopify"
                onMainClick={() => {
                  if (!isShopifyConnected) {
                    openStoreModal();
                    return;
                  }
                  handleShopifyNavigate(false);
                }}
                isShopifyConnected={isShopifyConnected}
                overlayLabel={isShopifyConnected ? t("shopifyConnected") : t("shopify")}
                ctaLabel={isShopifyConnected ? t("app") : t("connect")}
                onCTA={() => {
                  if (!isShopifyConnected) {
                    openStoreModal();
                    return;
                  }
                  handleShopifyNavigate(isShopifyConnected);
                }}
                isConnecting={isGeneratingToken || isConnectingShopify}
              />
            </div>

            {/* Analytics Boxes */}
            <div className="flex flex-col gap-4 w-full lg:w-auto">
              {/* Date Range Selector */}
              <div className="mb-2 flex justify-end relative">
                <button
                  onClick={() => setState((s) => ({ ...s, dateRangeDropdownOpen: !s.dateRangeDropdownOpen }))}
                  className="px-3 py-1 rounded-lg text-xs font-medium bg-gray-500/20 text-gray-300 hover:bg-gray-500/30 transition-colors backdrop-blur-sm flex items-center gap-1.5"
                >
                  {getDateRangeLabel()}
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {state.dateRangeDropdownOpen && (
                  <div className="absolute top-full right-0 mt-1 bg-gray-800 rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
                    <button
                      onClick={() => setState((s) => ({ ...s, dateRange: "week", dateRangeDropdownOpen: false }))}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                    >
                      {t("lastWeek")}
                    </button>
                    <button
                      onClick={() => setState((s) => ({ ...s, dateRange: "30days", dateRangeDropdownOpen: false }))}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                    >
                      {t("last30Days")}
                    </button>
                    <button
                      onClick={() => setState((s) => ({ ...s, dateRange: "ytd", dateRangeDropdownOpen: false }))}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                    >
                      {t("yearToDate")}
                    </button>
                  </div>
                )}
              </div>

              {/* Revenue Box */}
              <div className="bg-[#F26915] rounded-2xl p-5 shadow-lg">
                <div className="flex flex-col">
                  <span className="text-white/80 text-sm font-medium mb-1">
                    {t("revenue")}
                  </span>
                  <span className="text-3xl font-bold text-white">
                    {state.analyticsLoading ? "..." : formatCurrency(state.analytics?.revenue)}
                  </span>
                </div>
              </div>

              {/* Conversions Box */}
              <div className="bg-[#F26915] rounded-2xl p-5 shadow-lg">
                <div className="flex flex-col">
                  <span className="text-white/80 text-sm font-medium mb-1">
                    {t("conversions")}
                  </span>
                  <span className="text-3xl font-bold text-white">
                    {state.analyticsLoading ? "..." : formatNumber(state.analytics?.conversions)}
                  </span>
                </div>
              </div>

              {/* Clicks Box */}
              <div className="bg-[#F26915] rounded-2xl p-5 shadow-lg">
                <div className="flex flex-col">
                  <span className="text-white/80 text-sm font-medium mb-1">
                    {t("clicks")}
                  </span>
                  <span className="text-3xl font-bold text-white">
                    {state.analyticsLoading ? "..." : formatNumber(state.analytics?.clicks)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Gradient Card with Brand Profile */}
          <div
            className="w-full max-w-[420px] lg:w-[420px] h-[560px] rounded-[30px] p-8 sm:p-12 relative overflow-hidden cursor-pointer flex-shrink-0 mx-auto lg:mx-0"
            style={{
              background: "linear-gradient(105.96deg, #F26915 0%, #390A21 58.23%, #000000 100%)",
            }}
            onClick={() => router.push('/brand/analytics')}
          >
            {/* Brand Profile Picture Circle */}
            <div className="relative w-[200px] sm:w-[250px] h-[200px] sm:h-[250px] rounded-full mx-auto mb-6 sm:mb-8 overflow-hidden">
              <Image
                src={profileImage}
                alt={brandName}
                fill
                className="object-cover"
                sizes="250px"
              />
            </div>

            {/* Analytics Link */}
            <div className="flex items-center justify-between mb-6 sm:mb-8">
              <h4 className="text-white text-lg sm:text-xl font-normal">
                {t("analytics")}
              </h4>
              <button className="w-6 h-6 rounded-full border border-white flex items-center justify-center">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M4.5 2L8.5 6L4.5 10"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            {/* Stats List */}
            <div className="space-y-3">
              {[
                { label: t("myCampaigns"), value: state.campaigns?.length || 0, clickable: true, path: "/brand/campaign"},
                { label: t("latestAmbassadors"), value: state.ambassadors?.length || 0, clickable: true, path: "/marketplace" },
              ].map((stat, idx) => (
                <div key={idx}>
                  <div
                    className={`flex items-center justify-between py-2 ${stat.clickable ? 'cursor-pointer hover:opacity-80' : ''}`}
                    style={{ opacity: stat.opacity || 1 }}
                    onClick={(e) => {
                      if (stat.clickable && stat.path) {
                        e.stopPropagation();
                        router.push(stat.path);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-white" />
                      <span className="text-white text-base sm:text-lg font-medium">
                        {stat.label}
                      </span>
                    </div>
                    <span className="text-white text-base sm:text-lg font-medium">
                      {stat.value}
                    </span>
                  </div>
                  <div
                    className="h-px bg-white/40"
                    style={{ opacity: stat.opacity || 1 }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Analytics Boxes - Mobile Only */}
          <div className="lg:hidden flex flex-col gap-4 w-full max-w-[420px] mx-auto">
            {/* Date Range Selector */}
            <div className="mb-2 flex justify-end relative">
              <button
                onClick={() => setState((s) => ({ ...s, dateRangeDropdownOpen: !s.dateRangeDropdownOpen }))}
                className="px-3 py-1 rounded-lg text-xs font-medium bg-gray-500/20 text-gray-300 hover:bg-gray-500/30 transition-colors backdrop-blur-sm flex items-center gap-1.5"
              >
                {getDateRangeLabel()}
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {state.dateRangeDropdownOpen && (
                <div className="absolute top-full right-0 mt-1 bg-gray-800 rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
                  <button
                    onClick={() => setState((s) => ({ ...s, dateRange: "week", dateRangeDropdownOpen: false }))}
                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                  >
                    {t("lastWeek")}
                  </button>
                  <button
                    onClick={() => setState((s) => ({ ...s, dateRange: "30days", dateRangeDropdownOpen: false }))}
                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                  >
                    {t("last30Days")}
                  </button>
                  <button
                    onClick={() => setState((s) => ({ ...s, dateRange: "ytd", dateRangeDropdownOpen: false }))}
                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                  >
                    {t("yearToDate")}
                  </button>
                </div>
              )}
            </div>

            {/* Revenue Box */}
            <div className="bg-[#F26915] rounded-2xl p-5 shadow-lg">
              <div className="flex flex-col">
                <span className="text-white/80 text-sm font-medium mb-1">
                  {t("revenue")}
                </span>
                <span className="text-3xl font-bold text-white">
                  {state.analyticsLoading ? "..." : formatCurrency(state.analytics?.revenue)}
                </span>
              </div>
            </div>

            {/* Conversions Box */}
            <div className="bg-[#F26915] rounded-2xl p-5 shadow-lg">
              <div className="flex flex-col">
                <span className="text-white/80 text-sm font-medium mb-1">
                  {t("conversions")}
                </span>
                <span className="text-3xl font-bold text-white">
                  {state.analyticsLoading ? "..." : formatNumber(state.analytics?.conversions)}
                </span>
              </div>
            </div>

            {/* Clicks Box */}
            <div className="bg-[#F26915] rounded-2xl p-5 shadow-lg">
              <div className="flex flex-col">
                <span className="text-white/80 text-sm font-medium mb-1">
                  {t("clicks")}
                </span>
                <span className="text-3xl font-bold text-white">
                  {state.analyticsLoading ? "..." : formatNumber(state.analytics?.clicks)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Latest Ambassadors (Desktop Only) */}
        <div className="hidden lg:block w-full">
          <h3 className="text-xl font-normal mb-2">{t("latestAmbassadors")}</h3>
          {state.ambassadors.length > 0 && (
            <div className="flex justify-end max-w-4xl mb-4">
              <span
                className="text-xs text-white/60 cursor-pointer hover:text-white transition-colors"
                onClick={() => router.push('/marketplace')}
              >
                {t("viewAll")}
              </span>
            </div>
          )}

          {/* Ambassador Cards Grid */}
          {state.loading ? (
            <div className="text-center py-12 text-white/60">
              {t("loading")}
            </div>
          ) : state.error ? (
            <div className="text-center py-12 text-red-400">
              {state.error}
            </div>
          ) : state.ambassadors.length > 0 ? (
            <div className="grid grid-cols-4 gap-4 max-w-4xl">
              {state.ambassadors.slice(0, 4).map((a) => {
                const { name, avatar, subRole } = getAmbassadorDisplay(a, t);
                return (
                  <div
                    key={a._id}
                    className="w-full aspect-square rounded-[30px] overflow-hidden cursor-pointer relative group"
                    onClick={() => {
                      const slug = buildAmbassadorSlug(a);
                      if (slug) router.push(`/ambassador/${slug}`);
                      else router.push(`/sports-ambassador-profile/${a?.subRole}/${a?.supabaseId}`);
                    }}
                  >
                    <Image
                      src={avatar}
                      alt={name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="220px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h4 className="text-white font-semibold text-sm line-clamp-2">
                        {name}
                      </h4>
                      <p className="text-white/80 text-xs capitalize line-clamp-1">
                        {subRole}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-white/60">
              {t("noAmbassadors")}
            </div>
          )}
        </div>

        {/* Store name modal for first-time Shopify connect */}
        {!isShopifyConnected && state.storeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-black">
                  {t("connectShopifyStore")}
                </h3>
                <button
                  type="button"
                  onClick={closeStoreModal}
                  className="text-gray-500 hover:text-black"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-gray-700 mb-2">
                {t("connectShopifyDesc")}
              </p>
              <p className="text-xs text-gray-500 mb-3 italic">
                {t("connectShopifyExample")}
              </p>
              <div className="flex flex-col gap-3">
                <input
                  id="shopify-store-modal"
                  type="text"
                  value={state.storeNameInput}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      storeNameInput: e.target.value,
                      storeNameError: "",
                    }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none text-black"
                  placeholder={t("storeNamePlaceholder")}
                  autoComplete="off"
                />
                {state.storeNameError && (
                  <p className="text-xs text-red-600">{state.storeNameError}</p>
                )}
                <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-md p-3">
                  <p className="text-xs text-orange-700 leading-relaxed">
                    {t("connectShopifyWarning")}
                  </p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closeStoreModal}
                    className="px-4 py-2 rounded-md border border-gray-300 text-sm hover:bg-gray-50 text-black"
                  >
                    {t("cancelBtn")}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShopifyNavigate(false)}
                    className="px-4 py-2 rounded-md bg-black text-white text-sm hover:bg-gray-900"
                  >
                    {t("continueBtn")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // If sports-ambassador, render new dark-themed dashboard
  if (role === "sports-ambassador") {
    return (
      <div className="text-white px-4 sm:px-8 lg:px-16 py-12">
        {/* Welcome Message - Mobile */}
        <div className="lg:hidden mb-8 text-left">
          <h2 className="text-2xl font-normal mb-2 tracking-tight">
            {t("welcome")} {athleteName}
          </h2>
          <p className="text-white/80 text-base max-w-2xl mb-6">
            {t("welcomeMessage")}
          </p>

          {/* CTA Button - Mobile */}
          {!isStripeSetup ? (
            <button
              onClick={() => router.push('/sports-ambassador/settings/payments')}
              className="w-full px-8 py-3 bg-[#F26915] text-white rounded-full text-base font-medium hover:bg-[#d95a12] transition-colors"
            >
              {t("setupStripe")}
            </button>
          ) : (
            <button
              onClick={() => router.push('/sports-ambassador/all-campaigns')}
              className="w-full px-8 py-3 bg-[#F26915] text-white rounded-full text-base font-medium hover:bg-[#d95a12] transition-colors"
            >
              {t("exploreCampaigns")}
            </button>
          )}
        </div>

        {/* Top Section - Welcome and Card */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 items-center lg:items-end justify-between mb-12">
          {/* Left - Welcome Message and Analytics */}
          <div className="flex-1 w-full lg:w-auto hidden lg:block">
            <h2 className="text-2xl font-normal mb-2 tracking-tight">
              {t("welcome")} {athleteName}
            </h2>
            <p className="text-white/80 text-base max-w-2xl mb-8">
              {t("welcomeMessage")}
            </p>

            {/* CTA Button */}
            {!isStripeSetup ? (
              <button
                onClick={() => router.push('/sports-ambassador/settings/payments')}
                className="mb-8 px-8 py-3 bg-[#F26915] text-white rounded-full text-base font-medium hover:bg-[#d95a12] transition-colors"
              >
                {t("setupStripe")}
              </button>
            ) : (
              <button
                onClick={() => router.push('/sports-ambassador/all-campaigns')}
                className="mb-8 px-8 py-3 bg-[#F26915] text-white rounded-full text-base font-medium hover:bg-[#d95a12] transition-colors"
              >
                {t("exploreCampaigns")}
              </button>
            )}

            {/* Analytics Boxes */}
            <div className="flex flex-col gap-4 w-full lg:w-auto">
              {/* Date Range Selector */}
              <div className="mb-2 flex justify-end relative">
                <button
                  onClick={() => setState((s) => ({ ...s, dateRangeDropdownOpen: !s.dateRangeDropdownOpen }))}
                  className="px-3 py-1 rounded-lg text-xs font-medium bg-gray-500/20 text-gray-300 hover:bg-gray-500/30 transition-colors backdrop-blur-sm flex items-center gap-1.5"
                >
                  {getDateRangeLabel()}
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {state.dateRangeDropdownOpen && (
                  <div className="absolute top-full right-0 mt-1 bg-gray-800 rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
                    <button
                      onClick={() => setState((s) => ({ ...s, dateRange: "week", dateRangeDropdownOpen: false }))}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                    >
                      {t("lastWeek")}
                    </button>
                    <button
                      onClick={() => setState((s) => ({ ...s, dateRange: "30days", dateRangeDropdownOpen: false }))}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                    >
                      {t("last30Days")}
                    </button>
                    <button
                      onClick={() => setState((s) => ({ ...s, dateRange: "ytd", dateRangeDropdownOpen: false }))}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                    >
                      {t("yearToDate")}
                    </button>
                  </div>
                )}
              </div>

              {/* Earnings Box */}
              <div className="bg-[#F26915] rounded-2xl p-5 shadow-lg">
                <div className="flex flex-col">
                  <span className="text-white/80 text-sm font-medium mb-1">
                    {t("earnings")}
                  </span>
                  <span className="text-3xl font-bold text-white">
                    {state.analyticsLoading ? "..." : formatCurrency(state.analytics?.earnings)}
                  </span>
                </div>
              </div>

              {/* Conversions Box */}
              <div className="bg-[#F26915] rounded-2xl p-5 shadow-lg">
                <div className="flex flex-col">
                  <span className="text-white/80 text-sm font-medium mb-1">
                    {t("conversions")}
                  </span>
                  <span className="text-3xl font-bold text-white">
                    {state.analyticsLoading ? "..." : formatNumber(state.analytics?.conversions)}
                  </span>
                </div>
              </div>

              {/* Shares Box */}
              <div className="bg-[#F26915] rounded-2xl p-5 shadow-lg">
                <div className="flex flex-col">
                  <span className="text-white/80 text-sm font-medium mb-1">
                    {t("shares")}
                  </span>
                  <span className="text-3xl font-bold text-white">
                    {state.analyticsLoading ? "..." : formatNumber(state.analytics?.shares)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Gradient Card with Stats */}
          <div
            className="w-full max-w-[420px] lg:w-[420px] h-[560px] rounded-[30px] p-8 sm:p-12 relative overflow-hidden cursor-pointer flex-shrink-0 mx-auto lg:mx-0"
            style={{
              background: "linear-gradient(105.96deg, #F26915 0%, #390A21 58.23%, #000000 100%)",
            }}
            onClick={async () => {
              const details = user?.onboardedDetails;
              let slug = "";
              try {
                slug = await resolveAmbassadorSlug(details);
              } catch (_) {
                slug = buildAmbassadorSlug(details);
              }

              if (slug) {
                router.push(`/ambassador/${slug}`);
              } else {
                router.push(
                  `/sports-ambassador-profile/${details?.subRole}/${details?.supabaseId}`,
                );
              }
            }}
          >
            {/* Profile Image Circle */}
            <div className="relative w-[200px] sm:w-[250px] h-[200px] sm:h-[250px] rounded-full mx-auto mb-6 sm:mb-8 overflow-hidden">
              <Image
                src={profileImage}
                alt={athleteName}
                fill
                className="object-cover"
                sizes="250px"
              />
            </div>

            {/* Update Storefront Link */}
            <div className="flex items-center justify-between mb-6 sm:mb-8">
              <h4 className="text-white text-lg sm:text-xl font-normal">
              {t("updateStorefront")}
              </h4>
              <button className="w-6 h-6 rounded-full border border-white flex items-center justify-center">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M4.5 2L8.5 6L4.5 10"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            {/* Stats List */}
            <div className="space-y-3">
              {[
                { label: t("activeCampaigns"), value: state.joinedCampaigns?.length || 0, clickable: true, path: "/sports-ambassador/campaigns"},
                { label: t("latestCampaignsCount"), value: state.latestCampaigns?.length || 0, clickable: true, path: "/sports-ambassador/all-campaigns" },
              ].map((stat, idx) => (
                <div key={idx}>
                  <div
                    className={`flex items-center justify-between py-2 ${stat.clickable ? 'cursor-pointer hover:opacity-80' : ''}`}
                    style={{ opacity: stat.opacity || 1 }}
                    onClick={(e) => {
                      if (stat.clickable && stat.path) {
                        e.stopPropagation();
                        router.push(stat.path);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-white" />
                      <span className="text-white text-base sm:text-lg font-medium">
                        {stat.label}
                      </span>
                    </div>
                    <span className="text-white text-base sm:text-lg font-medium">
                      {stat.value}
                    </span>
                  </div>
                  <div
                    className="h-px bg-white/40"
                    style={{ opacity: stat.opacity || 1 }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Analytics Boxes - Mobile Only */}
          <div className="lg:hidden flex flex-col gap-4 w-full max-w-[420px] mx-auto">
            {/* Date Range Selector */}
            <div className="mb-2 flex justify-end relative">
              <button
                onClick={() => setState((s) => ({ ...s, dateRangeDropdownOpen: !s.dateRangeDropdownOpen }))}
                className="px-3 py-1 rounded-lg text-xs font-medium bg-gray-500/20 text-gray-300 hover:bg-gray-500/30 transition-colors backdrop-blur-sm flex items-center gap-1.5"
              >
                {getDateRangeLabel()}
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {state.dateRangeDropdownOpen && (
                <div className="absolute top-full right-0 mt-1 bg-gray-800 rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
                  <button
                    onClick={() => setState((s) => ({ ...s, dateRange: "week", dateRangeDropdownOpen: false }))}
                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                  >
                    {t("lastWeek")}
                  </button>
                  <button
                    onClick={() => setState((s) => ({ ...s, dateRange: "30days", dateRangeDropdownOpen: false }))}
                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                  >
                    {t("last30Days")}
                  </button>
                  <button
                    onClick={() => setState((s) => ({ ...s, dateRange: "ytd", dateRangeDropdownOpen: false }))}
                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                  >
                    {t("yearToDate")}
                  </button>
                </div>
              )}
            </div>

            {/* Earnings Box */}
            <div className="bg-[#F26915] rounded-2xl p-5 shadow-lg">
              <div className="flex flex-col">
                <span className="text-white/80 text-sm font-medium mb-1">
                  {t("earnings")}
                </span>
                <span className="text-3xl font-bold text-white">
                  {state.analyticsLoading ? "..." : formatCurrency(state.analytics?.earnings)}
                </span>
              </div>
            </div>

            {/* Conversions Box */}
            <div className="bg-[#F26915] rounded-2xl p-5 shadow-lg">
              <div className="flex flex-col">
                <span className="text-white/80 text-sm font-medium mb-1">
                  {t("conversions")}
                </span>
                <span className="text-3xl font-bold text-white">
                  {state.analyticsLoading ? "..." : formatNumber(state.analytics?.conversions)}
                </span>
              </div>
            </div>

            {/* Shares Box */}
            <div className="bg-[#F26915] rounded-2xl p-5 shadow-lg">
              <div className="flex flex-col">
                <span className="text-white/80 text-sm font-medium mb-1">
                  {t("shares")}
                </span>
                <span className="text-3xl font-bold text-white">
                  {state.analyticsLoading ? "..." : formatNumber(state.analytics?.shares)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Latest Campaigns Section - Mobile Only */}
        {isStripeSetup && (
          <div className="lg:hidden mb-12">
            <h3 className="text-xl font-normal mb-2">{t("latestCampaignsCount")}</h3>
            {state.latestCampaigns.length > 0 && (
              <div className="flex justify-end mb-4">
                <span
                  className="text-xs text-white/60 cursor-pointer hover:text-white transition-colors"
                  onClick={() => router.push('/sports-ambassador/all-campaigns')}
                >
                  {t("viewAll")}
                </span>
              </div>
            )}

            {/* Campaign Cards Horizontal Scroll */}
            {state.loading ? (
              <div className="text-center py-12 text-white/60">
                {t("loading")}
              </div>
            ) : state.error ? (
              <div className="text-center py-12 text-red-400">
                {state.error}
              </div>
            ) : state.latestCampaigns.length > 0 ? (
              <div className="overflow-x-auto scrollbar-hide -mx-4 sm:-mx-8 px-4 sm:px-8" style={{ WebkitOverflowScrolling: 'touch' }}>
                <div className="flex gap-4 pb-2">
                  {state.latestCampaigns.slice(0, 4).map((c) => {
                    const cover =
                      c?.assets?.logos?.[0]?.url ||
                      c?.basics?.coverImages?.[0]?.url ||
                      "/assets/images/whoisthis.png";
                    return (
                      <div
                        key={c._id}
                        className="flex-shrink-0 w-[calc(50%-0.5rem)] aspect-square rounded-[30px] overflow-hidden cursor-pointer relative group"
                        onClick={() => router.push(`/campaign-details/${c?._id}`)}
                      >
                        <Image
                          src={cover}
                          alt={c?.basics?.title || t("campaign")}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="50vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <h4 className="text-white font-semibold text-sm line-clamp-2">
                            {c?.brandName || c?.basics?.title || t("untitledCampaign")}
                          </h4>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-white/60">
                {t("noCampaigns")}
              </div>
            )}
          </div>
        )}

        {/* Bottom Section - Latest Campaigns (Desktop Only) */}
        {isStripeSetup && (
          <div className="hidden lg:block w-full">
            <h3 className="text-xl font-normal mb-2">{t("latestCampaignsCount")}</h3>
            {state.latestCampaigns.length > 0 && (
              <div className="flex justify-end max-w-4xl mb-4">
                <span
                  className="text-xs text-white/60 cursor-pointer hover:text-white transition-colors"
                  onClick={() => router.push('/sports-ambassador/all-campaigns')}
                >
                  {t("viewAll")}
                </span>
              </div>
            )}

            {/* Campaign Cards Grid */}
            {state.loading ? (
              <div className="text-center py-12 text-white/60">
                {t("loading")}
              </div>
            ) : state.error ? (
              <div className="text-center py-12 text-red-400">
                {state.error}
              </div>
            ) : state.latestCampaigns.length > 0 ? (
              <div className="grid grid-cols-4 gap-4 max-w-4xl">
                {state.latestCampaigns.slice(0, 4).map((c) => {
                  const cover =
                    c?.assets?.logos?.[0]?.url ||
                    c?.basics?.coverImages?.[0]?.url ||
                    "/assets/images/whoisthis.png";
                  return (
                    <div
                      key={c._id}
                      className="w-full aspect-square rounded-[30px] overflow-hidden cursor-pointer relative group"
                      onClick={() => router.push(`/campaign-details/${c?._id}`)}
                    >
                      <Image
                        src={cover}
                        alt={c?.basics?.title || t("campaign")}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="220px"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <h4 className="text-white font-semibold text-sm line-clamp-2">
                          {c?.brandName || c?.basics?.title || t("untitledCampaign")}
                        </h4>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-white/60">
                {t("noCampaigns")}
              </div>
            )}
          </div>
        )}

        {/* Stripe setup reminder modal */}
        {showStripeReminderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-black">
                  {t("stripeSetupRequired")}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    dismissStripeReminder();
                    setShowStripeReminderModal(false);
                  }}
                  className="text-gray-500 hover:text-black"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-gray-700 mb-4">
                {t("stripeSetupMessage")}
              </p>
              <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-md p-3 mb-4">
                <p className="text-xs text-orange-700 leading-relaxed">
                  {t("stripeSetupWarning")}
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    dismissStripeReminder();
                    setShowStripeReminderModal(false);
                  }}
                  className="px-4 py-2 rounded-md border border-gray-300 text-sm hover:bg-gray-50 text-black"
                >
                  {t("remindLater")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowStripeReminderModal(false);
                    router.push('/sports-ambassador/settings/payments');
                  }}
                  className="px-4 py-2 rounded-md bg-[#F26915] text-white text-sm hover:bg-[#d95a12]"
                >
                  {t("setupStripe")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Original dashboard for other roles
  return (
    <>
      <div className="lg:px-[64px] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 h-fit lg:max-w-[1092px]">
        <ProfileTile role={role} welcomeText={welcomeText} />
        {/* --------------- */}
        <div className="flex flex-col gap-8">
          {role !== "fan" && (
            <div className="flex flex-col gap-2 max-w-[300px] w-full mx-auto">
              <h4 className="px-1 text-base font-semibold">
                {role === "brand" ? t("shopifyHeading") : t("myAccount")}
              </h4>
              <AccountCard
                role={role}
                imageSrc={profileImage}
                alt="profile"
                onMainClick={() => {
                  if (role === "brand") {
                    if (!isShopifyConnected) {
                      openStoreModal();
                      return;
                    }
                    handleShopifyNavigate(false);
                  }
                  if (role !== "brand") {
                    (async () => {
                      const details = user?.onboardedDetails;
                      let slug = "";
                      try {
                        slug = await resolveAmbassadorSlug(details);
                      } catch (_) {
                        slug = buildAmbassadorSlug(details);
                      }

                      if (slug) {
                        router.push(`/ambassador/${slug}`);
                      } else {
                        router.push(
                          `/sports-ambassador-profile/${details?.subRole}/${details?.supabaseId}`,
                        );
                      }
                    })();
                  }
                }}
                isShopifyConnected={isShopifyConnected}
                overlayLabel={
                  isShopifyConnected ? t("shopifyConnected") : t("shopify")
                }
                ctaLabel={isShopifyConnected ? t("app") : t("connect")}
                onCTA={() => {
                  if (!isShopifyConnected) {
                    openStoreModal();
                    return;
                  }
                  handleShopifyNavigate(isShopifyConnected);
                }}
                isConnecting={isGeneratingToken || isConnectingShopify}
              />
            </div>
          )}

          {/* Section: My campaigns / Latest ambassadors (fan) */}
          <div className="flex flex-col gap-2 max-w-[300px] w-full mx-auto">
            <h4 className="px-1 text-base font-semibold">
              {role === "fan" ? t("latestAmbassadors") : t("myCampaigns")}
            </h4>
            <div className="w-full relative max-h-[300px] md:max-w-[300px] rounded-2xl overflow-hidden">
              <div className="relative dashboard-latestCampaigns-carousel h-full bg-[#0C0D0626]">
                <Swiper pagination={true} modules={[Pagination]}>
                  {role === "brand" ? (
                    state.loading ? (
                      <SwiperSlide>
                        <div className="h-[265px] w-full p-8 flex items-center justify-center">
                          {t("loadingCampaigns")}
                        </div>
                      </SwiperSlide>
                    ) : state.error ? (
                      <SwiperSlide>
                        <div className="h-[265px] w-full p-8 text-red-600">
                          {state.error}
                        </div>
                      </SwiperSlide>
                    ) : state.campaigns.length > 0 ? (
                      state.campaigns.slice(0, 3).map((c) => (
                        <SwiperSlide key={c._id}>
                          <CampaignSlide
                            cover={getCampaignCover(c)}
                            title={c?.basics?.title || t("untitledCampaign")}
                            onClick={() =>
                              router.push(`/campaign-details/${c?._id}`)
                            }
                          />
                        </SwiperSlide>
                      ))
                    ) : (
                      <SwiperSlide>
                        <div className="h-[300px] w-full p-8">
                          {t("noCampaigns")}
                        </div>
                      </SwiperSlide>
                    )
                  ) : role === "sports-ambassador" ? (
                    state.loading ? (
                      <SwiperSlide>
                        <div className="h-[300px] w-full p-8 flex items-center justify-center">
                          {t("loadingJoinedCampaigns")}
                        </div>
                      </SwiperSlide>
                    ) : state.error ? (
                      <SwiperSlide>
                        <div className="h-[300px] w-full p-8 text-red-600">
                          {state.error}
                        </div>
                      </SwiperSlide>
                    ) : state.joinedCampaigns.length > 0 ? (
                      state.joinedCampaigns.slice(0, 3).map((c) => {
                        const cover = c?.logo || "/assets/images/whoisthis.png";

                        return (
                          <SwiperSlide key={c._id}>
                            <div
                              className="w-full aspect-square p-0 relative cursor-pointer"
                              onClick={() =>
                                router.push(`/campaign-details/${c?._id}`)
                              }
                            >
                              <Image
                                src={cover}
                                alt={c?.title || t("campaign")}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, 300px"
                              />
                              <div className="absolute inset-0 bg-black/40" />
                              <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                                <h5 className="text-lg font-semibold line-clamp-1">
                                  {c?.brandName || t("untitledCampaign")}
                                </h5>
                                {/* <p className="text-sm opacity-80 line-clamp-2">
                              {c?.description || ""}
                            </p> */}
                              </div>
                            </div>
                          </SwiperSlide>
                        );
                      })
                    ) : (
                      <SwiperSlide>
                        <div className="h-[300px] w-full p-8">
                          {t("noJoinedCampaigns")}
                        </div>
                      </SwiperSlide>
                    )
                  ) : role === "fan" ? (
                    state.loading ? (
                      <SwiperSlide>
                        <div className="h-[300px] w-full p-8 flex items-center justify-center">
                          {t("loadingAmbassadors")}
                        </div>
                      </SwiperSlide>
                    ) : state.error ? (
                      <SwiperSlide>
                        <div className="h-[300px] w-full p-8 text-red-600">
                          {state.error}
                        </div>
                      </SwiperSlide>
                    ) : state.fanAmbassadors.length > 0 ? (
                      state.fanAmbassadors.slice(0, 3).map((a) => {
                        const { name, avatar, subRole } = getAmbassadorDisplay(
                          a,
                          t,
                        );
                        const onClick = () => {
                          const slug = buildAmbassadorSlug(a);
                          if (slug) router.push(`/ambassador/${slug}`);
                          else
                            router.push(
                              `/sports-ambassador-profile/${a?.subRole}/${a?.supabaseId}`,
                            );
                        };
                        return (
                          <SwiperSlide key={a._id}>
                            <AmbassadorSlide
                              name={name}
                              avatar={avatar}
                              subRole={subRole}
                              onClick={onClick}
                            />
                          </SwiperSlide>
                        );
                      })
                    ) : (
                      <SwiperSlide>
                        <div className="h-[300px] w-full p-8">
                          {t("noAmbassadors")}
                        </div>
                      </SwiperSlide>
                    )
                  ) : (
                    <>
                      <SwiperSlide>
                        <div className="h-[300px] w-full p-8">
                          {t("latestCampaigns")}
                        </div>
                      </SwiperSlide>
                      <SwiperSlide>
                        <div className="h-[300px] w-full p-8">
                          {t("latestCampaigns")}
                        </div>
                      </SwiperSlide>
                      <SwiperSlide>
                        <div className="h-[300px] w-full p-8">
                          {t("latestCampaigns")}
                        </div>
                      </SwiperSlide>
                    </>
                  )}
                </Swiper>
              </div>
            </div>
          </div>

          {role === "fan" && (
            <div className="flex flex-col gap-2 max-w-[300px] mx-auto w-full">
              <h4 className="px-1 text-base font-semibold">{t("saved")}</h4>
              <div className="w-full relative  max-h-[300px] rounded-2xl overflow-hidden">
                <div className="relative dashboard-latestCampaigns-carousel h-full bg-[#0C0D0626]">
                  <Swiper pagination={true} modules={[Pagination]}>
                    {state.loading ? (
                      <SwiperSlide>
                        <div className="h-[300px] w-full p-8 flex items-center justify-center">
                          {t("loadingFavourites")}
                        </div>
                      </SwiperSlide>
                    ) : state.error ? (
                      <SwiperSlide>
                        <div className="h-[300px] w-full p-8 text-red-600">
                          {state.error}
                        </div>
                      </SwiperSlide>
                    ) : state.fanFavourites.length > 0 ? (
                      state.fanFavourites.map((it, idx) => (
                        <SwiperSlide key={idx}>
                          <FavouriteSlide
                            cover={it.cover}
                            title={it.title}
                            subtitle={t(it.type)}
                            onClick={() => {
                              if (it?.type === "campaign") {
                                router.push(`/marketplace`);
                              } else {
                                const minimal = {
                                  subRole: it?.subRole,
                                  supabaseId: it?.supabaseId,
                                };
                                const raw = (it?.subRole || "").toString();
                                const norm = raw
                                  .toLowerCase()
                                  .replace(/\s+/g, "")
                                  .replace(/_/g, "-");
                                const roleKey =
                                  norm === "ex-athlete" || norm === "exathlete"
                                    ? "exAthlete"
                                    : norm === "para-athlete" ||
                                        norm === "paraathlete"
                                      ? "paraAthlete"
                                      : norm === "coach"
                                        ? "coach"
                                        : norm === "influencer"
                                          ? "influencer"
                                          : norm === "team"
                                            ? "team"
                                            : "athlete";
                                try {
                                  minimal[roleKey] = {
                                    name: it?.title,
                                    tracking_key:
                                      it?.tracking_key || it?.trackingKey || "",
                                  };
                                } catch (_) {}
                                let slug = buildAmbassadorSlug(minimal);
                                if (!slug) {
                                  const base = toSlug(it?.title || "");
                                  const idSuffix = String(
                                    it?.supabaseId || "",
                                  ).slice(-8);
                                  if (base)
                                    slug = idSuffix
                                      ? `${base}-${idSuffix}`
                                      : base;
                                }
                                if (slug) router.push(`/ambassador/${slug}`);
                                else
                                  router.push(
                                    `/sports-ambassador-profile/${it?.subRole}/${it?.supabaseId}`,
                                  );
                              }
                            }}
                          />
                        </SwiperSlide>
                      ))
                    ) : (
                      <SwiperSlide>
                        <div className="h-[300px] w-full p-8">
                          {t("noFavourites")}
                        </div>
                      </SwiperSlide>
                    )}
                  </Swiper>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ---------------- */}
        <div className="flex md:col-span-2 flex-col md:flex-row lg:col-span-1 lg:flex-col gap-8">
          {/* Contextual heading for the second carousel */}
          <div className="flex flex-col gap-2 w-[300px] mx-auto justify-center">
            {role !== "fan" && (
              <>
                {role === "brand" && (
                  <div className="flex flex-col gap-2">
                    <h4 className="px-1 text-base font-semibold">
                      {t("latestAmbassadors")}
                    </h4>
                  </div>
                )}
                {role === "sports-ambassador" && (
                  <div className="flex flex-col gap-2">
                    <h4 className="px-1 text-base font-semibold">
                      {t("latestBrands")}
                    </h4>
                  </div>
                )}

                <div className="w-full relative max-h-[300px] md:max-w-[300px] rounded-2xl overflow-hidden">
                  <div className="relative dashboard-latestCampaigns-carousel h-full bg-[#0C0D0626]">
                    <Swiper pagination={true} modules={[Pagination]}>
                      {role === "brand" ? (
                        state.loading ? (
                          <SwiperSlide>
                            <div className="h-[300px] w-full p-8 flex items-center justify-center">
                              {t("loadingAmbassadors")}
                            </div>
                          </SwiperSlide>
                        ) : state.error ? (
                          <SwiperSlide>
                            <div className="h-[300px] w-full p-8 text-red-600">
                              {state.error}
                            </div>
                          </SwiperSlide>
                        ) : state.ambassadors.length > 0 ? (
                          state.ambassadors.slice(0, 3).map((a) => {
                            const { name, avatar, subRole } = getAmbassadorDisplay(
                              a,
                              t,
                            );
                            return (
                              <SwiperSlide key={a._id}>
                                <div
                                  onClick={() => {
                                    const slug = buildAmbassadorSlug(a);
                                    if (slug) router.push(`/ambassador/${slug}`);
                                    else
                                      router.push(
                                        `/sports-ambassador-profile/${a?.subRole}/${a?.supabaseId}`,
                                      );
                                  }}
                                  className="w-full aspect-square p-0 relative flex items-end cursor-pointer"
                                >
                                  <Image
                                    src={avatar}
                                    alt={name}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 100vw, 300px"
                                  />
                                  <div className="absolute inset-0 bg-black/40" />
                                  <div className="relative w-full p-4 text-white">
                                    <h5 className="text-lg font-semibold line-clamp-1">
                                      {name}
                                    </h5>
                                    <p className="text-sm opacity-80 line-clamp-1 capitalize">
                                      {subRole}
                                    </p>
                                  </div>
                                </div>
                              </SwiperSlide>
                            );
                          })
                        ) : (
                          <SwiperSlide>
                            <div className="h-[300px] w-full p-8">
                              {t("noAmbassadors")}
                            </div>
                          </SwiperSlide>
                        )
                      ) : role === "sports-ambassador" ? (
                        state.loading ? (
                          <SwiperSlide>
                            <div className="h-[300px] w-full p-8 flex items-center justify-center">
                              {t("loadingCampaigns")}
                            </div>
                          </SwiperSlide>
                        ) : state.error ? (
                          <SwiperSlide>
                            <div className="h-[300px] w-full p-8 text-red-600">
                              {state.error}
                            </div>
                          </SwiperSlide>
                        ) : state.latestCampaigns.length > 0 ? (
                          state.latestCampaigns.slice(0, 3).map((c) => {
                            const cover =
                              c?.assets?.logos?.[0]?.url ||
                              c?.basics?.coverImages?.[0]?.url ||
                              "/assets/images/whoisthis.png";
                            return (
                              <SwiperSlide key={c._id}>
                                <div
                                  className="w-full aspect-square p-0 relative cursor-pointer"
                                  onClick={() =>
                                    router.push(`/campaign-details/${c?._id}`)
                                  }
                                >
                                  <Image
                                    src={cover}
                                    alt={c?.basics?.title || t("campaign")}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 100vw, 300px"
                                  />
                                  <div className="absolute inset-0 bg-black/40" />
                                  <div className="relative w-full p-4 text-white">
                                    <h5 className="text-lg font-semibold line-clamp-1">
                                      {c?.brandName || t("untitledCampaign")}
                                    </h5>
                                  </div>
                                </div>
                              </SwiperSlide>
                            );
                          })
                        ) : (
                          <SwiperSlide>
                            <div className="h-[300px] w-full p-8">
                              {t("noCampaigns")}
                            </div>
                          </SwiperSlide>
                        )
                      ) : (
                        <>
                          <SwiperSlide>
                            <div className="h-[300px] w-full p-8">
                              {t("latestCampaigns")}
                            </div>
                          </SwiperSlide>
                          <SwiperSlide>
                            <div className="h-[300px] w-full p-8">
                              {t("latestCampaigns")}
                            </div>
                          </SwiperSlide>
                          <SwiperSlide>
                            <div className="h-[300px] w-full p-8">
                              {t("latestCampaigns")}
                            </div>
                          </SwiperSlide>
                        </>
                      )}
                    </Swiper>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col gap-2 max-w-[300px] w-full mx-auto">
            {role !== "fan" && (
              <>
                <h4 className="px-1 text-base font-semibold">
                  {t("analytics")}
                </h4>
                <div
                  className="w-full relative aspect-square bg-white rounded-2xl overflow-hidden cursor-pointer md:max-w-[300px] max-h-[300px]"
                  onClick={() => router.push(`/${role}/analytics`)}
                >
                  <Image
                    fill
                    draggable="false"
                    src={"/assets/images/Analytics_sbonssy.jpg"}
                    alt={t("analyticsPreviewAlt")}
                    sizes="(max-width: 768px) 100vw, 300px"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Store name modal for first-time Shopify connect */}
      {role === "brand" && !isShopifyConnected && state.storeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {t("connectShopifyStore")}
              </h3>
              <button
                type="button"
                onClick={closeStoreModal}
                className="text-gray-500 hover:text-black"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-gray-700 mb-2">
              {t("connectShopifyDesc")}
            </p>
            <p className="text-xs text-gray-500 mb-3 italic">
              {t("connectShopifyExample")}
            </p>
            <div className="flex flex-col gap-3">
              <input
                id="shopify-store-modal"
                type="text"
                value={state.storeNameInput}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    storeNameInput: e.target.value,
                    storeNameError: "",
                  }))
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
                placeholder={t("storeNamePlaceholder")}
                autoComplete="off"
              />
              {state.storeNameError && (
                <p className="text-xs text-red-600">{state.storeNameError}</p>
              )}
              <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-md p-3">
                <p className="text-xs text-orange-700 leading-relaxed">
                  {t("connectShopifyWarning")}
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeStoreModal}
                  className="px-4 py-2 rounded-md border border-gray-300 text-sm hover:bg-gray-50"
                >
                  {t("cancelBtn")}
                </button>
                <button
                  type="button"
                  onClick={() => handleShopifyNavigate(false)}
                  className="px-4 py-2 rounded-md bg-black text-white text-sm hover:bg-gray-900"
                >
                  {t("continueBtn")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
