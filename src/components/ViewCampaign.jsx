"use client";
import Loader from "@/components/Common/Loader/page";
import ActionButtons from "@/components/ViewCampaign/ActionButtons";
import AmbassadorModal from "@/components/ViewCampaign/AmbassadorModal";
import AmbassadorSelectButton from "@/components/ViewCampaign/AmbassadorSelectButton";
import BrandHeader, {
  CreateShareLinkBtn,
} from "@/components/ViewCampaign/BrandHeader";
import CampaignDetails from "@/components/ViewCampaign/CampaignDetails";
import MessageModal from "@/components/ViewCampaign/MessageModal";
import ProductsGrid from "@/components/ViewCampaign/ProductsGrid";
import ProductsToggleBar from "@/components/ViewCampaign/ProductsToggleBar";
import ShareLinkBox from "@/components/ViewCampaign/ShareLinkBox";
import TermsSection from "@/components/ViewCampaign/TermsSection";
import { useSocket } from "@/context/SocketContext";
import { useCampaigns } from "@/hook/useCampaigns";
import useCompensationTranslations from "@/hook/useCompensationTranslations";
import api from "@/lib/axios";
import { copyToClipboard } from "@/lib/clipboard";
import { useAuthStore } from "@/store/authStore";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";

const ViewCampaign = ({ details: initialDetails, user, campaignId }) => {
  const {
    handleJoinClick,
    handleApplyClick,
    handleCancelClick,
    handleFavourites,
    fetchFavourites,
    handleFavoriteClick,
    state: {
      requestStatuses,
      pendingRequestIds,
      isLoading,
      joinedCampaigns,
      favourites,
      favoriteCampaigns = [],
    },
  } = useCampaigns();

  const favCamIds = useMemo(
    () => favoriteCampaigns.map((data) => data?._id) ?? [],
    [favoriteCampaigns]
  );
  const t = useTranslations("CampaignDetails");
  const t1 = useTranslations("Brand.campaignCreate");
  const toastAlert = useTranslations("Sweetalert");
  const translateCompensation = useCompensationTranslations();
  const isCamFav = favCamIds?.includes(campaignId);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [ftcDisclosure, setFtcDisclosure] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false); //
  const [details, setDetails] = useState(initialDetails);
  const socket = useSocket();
  const [message, setMessage] = useState("");
  const [messageDetails, setMessageDetails] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user: authUser } = useAuthStore();
  const [shareUrls, setShareUrls] = useState({});
  const [shareLoading, setShareLoading] = useState({});
  const [shareError, setShareError] = useState("");
  const [showShare, setShowShare] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(null);

  // Helpers
  const showPermissionDenied = useCallback(() => {
    Swal.fire({
      title: toastAlert("denied"),
      text: toastAlert("permissionText"),
      icon: "info",
      showConfirmButton: true,
      confirmButtonText: toastAlert("ok"),
      customClass: {
        confirmButton: "confirmButton",
        cancelButton: "cancelButton",
      },
      timerProgressBar: false,
      timer: 5000,
    });
  }, [toastAlert]);

  const ensureTermsAccepted = useCallback(() => {
    if (!termsAccepted && (!termsAgreed || !ftcDisclosure)) {
      Swal.fire({
        title: toastAlert("termsRequired"),
        text: toastAlert("acceptTermsText"),
        icon: "warning",
        showConfirmButton: true,
        confirmButtonText: toastAlert("ok"),
        customClass: {
          confirmButton: "confirmButton",
          cancelButton: "cancelButton",
        },
        timerProgressBar: false,
        timer: 5000,
      });
      return false;
    }
    return true;
  }, [termsAccepted, termsAgreed, ftcDisclosure, toastAlert]);

  // Products link state derived from trackingId
  const [productsLink, setProductsLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [showProductsOnly, setShowProductsOnly] = useState(false);
  const [productProfileStatuses, setProductProfileStatuses] = useState({});
  const [loadingProductProfile, setLoadingProductProfile] = useState({});
  const [loadingProductShare, setLoadingProductShare] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (initialDetails?.trackingId && typeof window !== "undefined") {
      setProductsLink(
        `${window.location.origin}/api/campaign/products/${initialDetails.trackingId}`
      );
    }
  }, [initialDetails?.trackingId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownOpen && !event.target.closest(".dropdown-menu")) {
        setDropdownOpen(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  const handleShareProduct = async (product) => {
    const productId = product.shopifyProductId || product._id || product.id;
    if (!productId) return;

    setLoadingProductShare((prev) => ({ ...prev, [productId]: true }));
    try {
      const response = await api.post("/product-share", {
        productId,
        override: {
          campaignTrackingId: initialDetails?.trackingId || details?.trackingId,
          handle: product.handle || undefined,
        },
      });

      const success = response?.success;
      const shareUrl = response?.shareUrl;
      if (!success || !shareUrl) {
        throw new Error(response?.message || "Failed to generate product link");
      }

      // Use improved clipboard helper
      const copyOk = await copyToClipboard(shareUrl);

      if (copyOk) {
        // Determine the icon and message based on whether there's a warning
        const isWarning = response?.warning;
        const icon = isWarning ? "warning" : "success";
        const messageText = isWarning
          ? response.warning
          : t("checkoutLinkCopied") ||
            "Your product checkout link has been copied to clipboard. This link goes directly to Shopify checkout.";

        Swal.fire({
          title: messageText || t("copied") || "Link copied!",
          position: "top-right",
          icon: icon,
          toast: true,
          showConfirmButton: false,
          timer: isWarning ? 4000 : 2000,
        });
      } else {
        // Show improved fallback dialog for iOS
        await Swal.fire({
          title: t("copyManually") || "Tap the link to copy",
          html: `
            <textarea
              readonly
              id="copyProductTextArea"
              style="
                width: 100%;
                min-height: 80px;
                background: #f3f4f6;
                padding: 12px;
                border-radius: 8px;
                border: 1px solid #d1d5db;
                margin: 16px 0;
                word-break: break-all;
                font-size: 14px;
                resize: none;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              "
            >${shareUrl}</textarea>
            <p style="font-size: 14px; color: #6b7280; margin-top: 12px;">
              ${t("copyInstructions") || "Tap the link above to select it, then tap 'Copy' from the menu"}
            </p>
          `,
          confirmButtonText: t("ok") || "OK",
          customClass: {
            confirmButton: "confirmButton",
          },
          didOpen: () => {
            // Focus and select the textarea on iOS
            const textarea = document.getElementById('copyProductTextArea');
            if (textarea) {
              textarea.focus();
              textarea.select();
              // For iOS, also set selection range
              textarea.setSelectionRange(0, textarea.value.length);
            }
          },
        });
      }
    } catch (error) {
      console.error("Share product error:", error);
      Swal.fire({
        title: toastAlert("error") || "Error",
        text: toastAlert("couldNotGenerateLink"),
        position: "top-right",
        icon: "error",
        toast: true,
        showConfirmButton: false,
        timer: 5000,
      });
    } finally {
      setLoadingProductShare((prev) => ({ ...prev, [productId]: false }));
    }
  };

  const shareRef = useRef(null);

  const handleShare = useCallback(
    async (campaignId) => {
      if (shareUrls[campaignId] || shareLoading[campaignId]) return;

      setShareLoading((prev) => ({ ...prev, [campaignId]: true }));
      setShareError("");

      try {
        const response = await fetch("/api/campaign/share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaignId }),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || "Failed to generate share link");
        }

        setShareUrls((prev) => ({ ...prev, [campaignId]: result.shareUrl }));
      } catch (err) {
        setShareError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setShareLoading((prev) => ({ ...prev, [campaignId]: false }));
      }
    },
    [shareUrls, shareLoading]
  );

  const copyProductsLink = async () => {
    try {
      if (!productsLink) return;
      await navigator.clipboard.writeText(productsLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (_) {
      // no-op
    }
  };

  const handleProductProfile = async (product, action) => {
    const productId = product.shopifyProductId || product._id || product.id;
    if (!productId) return;

    setLoadingProductProfile((prev) => ({ ...prev, [productId]: true }));

    try {
      const result = await Swal.fire({
        title: action === "add" ? toastAlert("addToProfile") : toastAlert("sure"),
        text: `${
          action === "add"
            ? toastAlert("addProducts")
            : toastAlert("removeProducts")
        }`,
        // text: `${toastAlert("sureMsg")}${
        //   action === "add" ? toastAlert("accept") : toastAlert("decline")
        // } ${toastAlert("thisProduct")} ${
        //   action === "add" ? toastAlert("to") : toastAlert("from")
        // } ${toastAlert("yourProfile")}`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: action === "add" ? toastAlert("add") : toastAlert("yes"),
        cancelButtonText: action === "add" ? toastAlert("notNow") : toastAlert("no"),
        customClass: {
          confirmButton: "confirmButton",
          cancelButton: "cancelButton",
        },
      });

      if (result.isConfirmed) {
        const response = await api.post("/favorite-product", {
          productId,
          productData: {
            shopifyProductId: productId,
            name: product.name,
            description: product.description,
            price: product.price,
            currency: product.currency,
            image: product.image,
            // Extra fields to enable per-product sharing from profile
            handle: product.handle || "",
            variantId: product.variantId || product.variants?.[0]?.id || "",
            campaignTrackingId:
              initialDetails?.trackingId || details?.trackingId || "",
            brandId:
              details?.brandId?._id || initialDetails?.brandId?._id || null,
          },
          action,
        });

        if (response.success) {
          setProductProfileStatuses((prev) => ({
            ...prev,
            [productId]: action === "add" ? "added" : "removed",
          }));

          Swal.fire({
            title: `${toastAlert("product")} ${
              action === "add" ? toastAlert("added") : toastAlert("removed")
            } ${
              action === "add" ? toastAlert("profileAdd") : toastAlert("profileRemove")
            }`,
            position: "top-right",
            icon: "success",
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });
        }
      }
    } catch (error) {
      console.error("Product profile error:", error);
      Swal.fire({
        title: toastAlert("error"),
        text: toastAlert("failedUpdateProduct"),
        position: "top-right",
        icon: "error",
        toast: true,
        showConfirmButton: false,
        timer: 3000,
      });
    } finally {
      setLoadingProductProfile((prev) => ({ ...prev, [productId]: false }));
    }
  };

  // Fetch terms acceptance status
  useEffect(() => {
    const fetchTermsStatus = async () => {
      try {
        const response = await api.get(
          `/campaign/terms-status?campaignId=${campaignId}`
        );

        if (response?.termsAccepted) {
          setTermsAccepted(true);
          // If already accepted, set both checkboxes to checked
          setTermsAgreed(true);
          setFtcDisclosure(true);
        }
      } catch (error) {
        console.error("Failed to fetch terms status:", error);
      }
    };

    if (user?.role === "sports-ambassador") {
      fetchTermsStatus();
    }
  }, [campaignId, user?.role]);
  // Fetch user's product profile status on mount
  useEffect(() => {
    const fetchProductProfileStatuses = async () => {
      if (!Array.isArray(details.products) || details.products.length === 0)
        return;

      try {
        const productIds = details.products
          .map((p) => p.shopifyProductId || p._id || p.id)
          .filter(Boolean);
        if (productIds.length === 0) return;

        const response = await api.post("/check-favorite-products", {
          productIds,
        });
        if (response.success) {
          setProductProfileStatuses(response.statuses || {});
        }
      } catch (error) {
        console.error("Failed to fetch product profile statuses:", error);
      }
    };

    fetchProductProfileStatuses();
  }, [details.products, details._id]);

  const buttonStatus = useMemo(() => {
    if (isLoading) return "loading";
    const isJoined = joinedCampaigns.some((c) => c._id === details._id);
    if (isJoined) return "joined";
    const hasPendingRequest = pendingRequestIds[details._id] !== undefined;
    if (hasPendingRequest) return "pending";
    const requestStatus = requestStatuses[details._id];
    if (requestStatus) return requestStatus;
    return "not_applied";
  }, [
    isLoading,
    joinedCampaigns,
    requestStatuses,
    pendingRequestIds,
    details._id,
  ]);

  // Watch for campaign join status changes and update terms acceptance
  useEffect(() => {
    if (buttonStatus === "joined" && !termsAccepted) {
      // User has successfully joined the campaign, update terms acceptance
      setTermsAccepted(true);
      setTermsAgreed(true);
      setFtcDisclosure(true);
    }
  }, [buttonStatus, termsAccepted]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (shareRef.current && !shareRef.current.contains(event.target)) {
        setShowShare(false);
      }
    };
    if (showShare) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showShare]);

  // Removed side-effect that mutated details.ambassador from computed status to avoid false positives

  useEffect(() => {
    fetchFavourites();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.emit("join-user-room", user?.onboardedDetails?._id);
  }, [socket, user?.onboardedDetails?._id]);

  // Prevent background scrolling when messageDetails modal is open
  useEffect(() => {
    if (messageDetails) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [messageDetails]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setIsSending(true);
    try {
      socket.emit("send-message", {
        senderId: user?.onboardedDetails?._id,
        receiverId: details?.brandId?._id,
        content: message.trim(),
        attachment: null,
      });

      Swal.fire({
        title: toastAlert("messageSent"),
        position: "top-right",
        icon: "success",
        toast: true,
        timer: 3000,
        showConfirmButton: false,
      });

      setMessage("");
      closeModal();
    } catch (error) {
      Swal.fire({
        title: toastAlert("failedSendText"),
        text: error.message,
        position: "top-right",
        icon: "error",
        toast: true,
        timer: 5000,
      });
    } finally {
      setIsSending(false);
    }
  };

  const closeModal = () => setMessageDetails(null);

  const handleCampaignAction = async () => {
    try {
      if (buttonStatus === "pending") {
        if (user?.onboardedDetails?.permission === "Can View") {
          showPermissionDenied();
        } else {
          const requestId = pendingRequestIds[details._id];
          if (!requestId) {
            throw new Error("Pending request ID not found");
          }
          await handleCancelClick(details._id, details.brandId._id);
        }
      } else if (buttonStatus === "not_applied") {
        if (details.basics.campaignType === "public") {
          if (user?.onboardedDetails?.permission === "Can View") {
            showPermissionDenied();
          } else {
            if (!ensureTermsAccepted()) return;
            await handleJoinClick(details.brandId._id, details._id, true);
            if (typeof window !== "undefined") {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }
        } else {
          if (user?.onboardedDetails?.permission === "Can View") {
            showPermissionDenied();
          } else {
            if (!ensureTermsAccepted()) return;
            await handleApplyClick(details.brandId._id, details._id, true);
            if (typeof window !== "undefined") {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }
        }
      }
    } catch (error) {
      Swal.fire({
        title: toastAlert("actionFailed"),
        position: "top-right",
        icon: "error",
        toast: true,
        timer: 5000,
      });
    }
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal2 = () => {
    setIsModalOpen(false);
  };

  const renderButtonText = () => {
    switch (buttonStatus) {
      case "loading":
        return t("loading");
      case "joined":
        return t("joined");
      case "pending":
        return t("cancel");
      default:
        return details.basics.campaignType === "public"
          ? t("join")
          : t("request");
    }
  };

  const isFavorite = useMemo(
    () => favourites.some((fav) => fav.campaignId?._id === campaignId),
    [favourites, campaignId]
  );

  const handleAmbassadorRemoved = (interactionId) => {
    setDetails((prev) => ({
      ...prev,
      ambassadors: prev.ambassadors.filter((amb) => amb._id !== interactionId),
    }));
    setIsModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full min-h-[300px]">
        <Loader size="large" color="orange" />
      </div>
    );
  }
  const hasStyleGuideValues = useMemo(() => {
    return Object.values(details.assets?.styleGuide || {}).some(
      (val) => val !== ""
    );
  }, [details.assets?.styleGuide]);

  const brandShopifyConnected = useMemo(() => {
    const shopify = details?.brandId?.brand?.shopifyDetails;
    return !!(shopify?.myShopifyDomain && shopify?.shopifyId);
  }, [details?.brandId?.brand?.shopifyDetails]);

  
  const isPPSWithProducts = useMemo(() => {
    return (
      details?.compensation?.type === "pay-per-sale" &&
      Array.isArray(details?.products) &&
      details.products.length > 0
    );
  }, [details?.compensation?.type, details?.products]);

  const hideCreateShare = brandShopifyConnected && isPPSWithProducts; 
  const category = [
    { key: t1("step1.category.Apparel"), value: "apparel" },
    { key: t1("step1.category.Technology"), value: "technology" },
    { key: t1("step1.category.Nutrition"), value: "nutrition" },
    { key: t1("step1.category.Wellness"), value: "wellness" },
    { key: t1("step1.category.Footwear"), value: "footwear" },
    { key: t1("step1.category.Services"), value: "services" },
    { key: t1("step1.category.Media"), value: "media_content" },
    {
      key: t1("step1.category.Outdoor"),
      value: "outdoor_adventure_gear",
    },
    {
      key: t1("step1.category.Events"),
      value: "events_experiences",
    },
    {
      key: t1("step1.category.Accessories"),
      value: "accessories_equipment",
    },
    { key: t1("step1.category.Other"), value: "other" },
  ];

  // Region options for displaying targetRegions labels instead of raw values
  const regionOptions = [
    { value: "north_america", label: t1("regionOptions.North") },
    { value: "europe", label: t1("regionOptions.Europe") },
    { value: "asia", label: t1("regionOptions.Asia") },
    { value: "africa", label: t1("regionOptions.Africa") },
    { value: "south_america", label: t1("regionOptions.South") },
    { value: "australia", label: t1("regionOptions.Australia") },
  ];

  return (
    <div className="flex flex-col md:flex-row max-w-[1288.99px] lg:mx-auto gap-2 md:gap-4 lg:gap-[120.99px] mt-[38px] mb-20">
      <BrandHeader
        user={user}
        isFavorite={isFavorite}
        onToggleFavorite={() => handleFavourites(campaignId)}
        logoUrl={details.assets.logos[0].url}
        brandName={details?.brandId?.brand?.companyName}
        canCreateShare={
          user?.role === "sports-ambassador" &&
          buttonStatus === "joined" &&
          !hideCreateShare
        }
        onCreateShare={() => handleShare(campaignId)}
        createShareLoading={!!shareLoading[campaignId]}
        onOpenMessage={() =>
          setMessageDetails({
            id: details?.brandId?._id,
            name: details?.brandId?.brand?.companyName,
          })
        }
        t={t}
      />

      <div className="w-full max-w-[768px] space-y-8">
        <div className="flex gap-3 flex-col md:flex-row flex-wrap lg:gap-4">
          <ProductsToggleBar
            hasProducts={
              Array.isArray(details.products) && details.products.length > 0
            }
            userRole={user?.role}
            buttonStatus={buttonStatus}
            showProductsOnly={showProductsOnly}
            onToggle={() => setShowProductsOnly(!showProductsOnly)}
            t={t}
          />

          {user &&
            user?.role === "sports-ambassador" &&
            buttonStatus === "joined" &&
            !isPPSWithProducts && (
              <ActionButtons
                buttonStatus={buttonStatus}
                onSecondaryClick={() =>
                  isCamFav
                    ? handleFavoriteClick(campaignId, "remove")
                    : handleFavoriteClick(campaignId, "add")
                }
                secondaryLabel={isCamFav ? t("remove") : t("add")}
              />
            )}
          {user?.role === "sports-ambassador" &&
            buttonStatus === "joined" &&
            !hideCreateShare && (
              <button
                onClick={() => handleShare(campaignId)}
                disabled={!!shareLoading[campaignId]}
                className="primaryBtnPlain w-full h-fit lg:max-w-[240px] mx-auto md:mx-0 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {shareLoading[campaignId] ? t("creating") : t("create")}
              </button>
            )}
        </div>
        {shareUrls[campaignId] && (
          <ShareLinkBox
            shareUrl={shareUrls[campaignId]}
            t={t}
          />
        )}
        {shareError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{shareError}</p>
          </div>
        )}
        {showProductsOnly ? (
          <ProductsGrid
            products={details.products}
            t={t}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            termsAccepted={termsAccepted}
            buttonStatus={buttonStatus}
            user={user}
            productProfileStatuses={productProfileStatuses}
            loadingProductProfile={loadingProductProfile}
            loadingProductShare={loadingProductShare}
            onProductProfile={handleProductProfile}
            onShareProduct={handleShareProduct}
          />
        ) : (
          // Campaign Details View
          <>
            <CampaignDetails
              details={details}
              t={t}
              t1={t1}
              user={user}
              translateCompensation={translateCompensation}
              userRole={user?.role}
            />

            <TermsSection
              role={user?.role}
              termsAccepted={termsAccepted}
              campaignType={details?.basics?.campaignType}
              customTerms={details.legal.customTerms}
              termsAgreed={termsAgreed}
              setTermsAgreed={setTermsAgreed}
              ftcDisclosure={ftcDisclosure}
              setFtcDisclosure={setFtcDisclosure}
              t={t}
            />
            {user &&
              user?.role === "sports-ambassador" &&
              buttonStatus !== "joined" && (
                <ActionButtons
                  buttonStatus={buttonStatus}
                  t={t}
                  onPrimaryClick={handleCampaignAction}
                  onSecondaryClick={() =>
                    isCamFav
                      ? handleFavoriteClick(campaignId, "remove")
                      : handleFavoriteClick(campaignId, "add")
                  }
                  primaryLabel={renderButtonText()}
                  secondaryLabel={!isPPSWithProducts ? (isCamFav ? t("remove") : t("add")) : ""}
                />
              )}
            <AmbassadorSelectButton
              onClick={openModal}
              t={t}
              userRole={user?.role}
            />
          </>
        )}
        {isModalOpen && (
          <AmbassadorModal
            ambassadors={details.ambassadors}
            onClose={closeModal2}
            brandId={details.brandId?._id}
            onAmbassadorRemoved={handleAmbassadorRemoved}
            dropdownOpen={dropdownOpen}
            setDropdownOpen={setDropdownOpen}
          />
        )}
      </div>

      <MessageModal
        messageDetails={messageDetails}
        message={message}
        setMessage={setMessage}
        isSending={isSending}
        onClose={closeModal}
        onSubmit={handleSendMessage}
        t={t}
      />
    </div>
  );
};

export default ViewCampaign;
