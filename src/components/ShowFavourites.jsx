"use client";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import api from "@/lib/axios";
import Swal from "sweetalert2";

import { useTranslations } from "next-intl";
import DefaultLayout from "./Common/DefaultLayout.jsx/DefaultLayout";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Keyboard } from "swiper/modules";
import IconsLibrary from "@/util/IconsLibrary";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import { useCampaigns } from "@/hook/useCampaigns";
import { useRouter } from "next/navigation";

const getOptimizedUrl = (url, width = 800) => {
  if (typeof url !== "string" || !url.includes("cloudinary")) return url;
  if (url.includes("upload/")) {
    return url.replace("upload/", `upload/f_auto,q_auto,w_${width}/`);
  }
  return url;
};

const ShowFavourites = ({
  data = [],
  favoriteProducts = [],
  loadingProducts = false,
  onBack,
  pagination,
  handlePageChange,
  onProductRemove,
  id,
  handleFavoriteClick = () => {},
}) => {
  const t = useTranslations("Sports.fvrt");
  const toastAlert = useTranslations("Sweetalert");
  const router = useRouter();
  const [swiperReady, setSwiperReady] = useState(false);
  const swiperRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const prevRef = useRef(null);
  const nextRef = useRef(null);
  const { user } = useAuthStore();
  const [loadingProductShare, setLoadingProductShare] = useState({});
  const [loadingBrandShare, setLoadingBrandShare] = useState({});

  const handleShareCampaign = async (item) => {
    const campaignId = item.id || item._id;
    if (!campaignId) {
      console.error("Missing campaignId in item:", item);
      window.open(item.affilationLink || "#", "_blank");
      return;
    }

    const newWindow = window.open("", "_blank");

    setLoadingBrandShare((prev) => ({ ...prev, [campaignId]: true }));
    try {
      const response = await api.post("/campaign/share", { campaignId });
      if (response?.shareUrl) {
        if (newWindow) {
          newWindow.location.href = response.shareUrl;
        } else {
          window.open(response.shareUrl, "_blank");
        }
      } else {
        if (newWindow) {
          newWindow.location.href = item.affilationLink || "#";
        } else {
          window.open(item.affilationLink || "#", "_blank");
        }
      }
    } catch (error) {
      console.error("Share campaign error:", error);
      if (newWindow) {
        newWindow.location.href = item.affilationLink || "#";
      } else {
        window.open(item.affilationLink || "#", "_blank");
      }
    } finally {
      setLoadingBrandShare((prev) => ({ ...prev, [campaignId]: false }));
    }
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCampaign(null);
  };
  useEffect(() => {
    setSwiperReady(true); // ensures refs are attached before rendering Swiper
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSlideChange = () => {
    if (swiperRef.current) {
      setActiveIndex(swiperRef.current.swiper.realIndex);
    }
  };

  useEffect(() => {
    if (swiperRef.current && prevRef.current && nextRef.current) {
      swiperRef.current.swiper.params.navigation.prevEl = prevRef.current;
      swiperRef.current.swiper.params.navigation.nextEl = nextRef.current;

      // Destroy existing navigation, if any
      swiperRef.current.swiper.navigation.destroy();

      // Re-initialize with new refs
      swiperRef.current.swiper.navigation.init();
      swiperRef.current.swiper.navigation.update();
    }
  }, [swiperReady]);

  // Custom Pagination Controls
  const goToSlide = (index) => {
    if (swiperRef.current) {
      swiperRef.current.swiper.slideTo(index);
    }
  };

  const handleShareProduct = async (favorite) => {
    const product = favorite.productData;
    const productId = product?.shopifyProductId || favorite.productId;
    if (!productId) return;

    // Pre-open the window to avoid Safari popup blocker
    const newWindow = window.open("", "_blank");

    setLoadingProductShare((prev) => ({ ...prev, [productId]: true }));
    try {
      const response = await api.post("/product-share", {
        productId,
        override: {
          campaignTrackingId: product?.campaignTrackingId || undefined,
          handle: product?.handle || undefined,
        },
      });

      const success = response?.success;
      const shareUrl = response?.shareUrl;

   

      if (!success || !shareUrl) {
        throw new Error(response?.message || "Failed to generate product link");
      }

      // Update the pre-opened window URL
      if (newWindow) {
        newWindow.location.href = shareUrl;
      } else {
        window.open(shareUrl, "_blank");
      }

      // Show success message if there's a warning
      if (response?.warning) {
        Swal.fire({
          title: response.warning,
          position: "top-right",
          icon: "warning",
          toast: true,
          showConfirmButton: false,
          timer: 4000,
        });
      }
    } catch (error) {
      console.error("Share product error:", error);
      if (newWindow) newWindow.close(); // Close the blank tab on error

      Swal.fire({
        title: toastAlert("error") || "Error",
        text: error?.message || "Could not generate share link",
        position: "top-right",
        icon: "error",
        toast: true,
        showConfirmButton: false,
        timer: 3000,
      });
    } finally {
      setLoadingProductShare((prev) => ({ ...prev, [productId]: false }));
    }
  };

  return (
    <section>
      <DefaultLayout>
        <div className="p-4">
          {/* Favourite Brands Section - Commented Out */}
          {/* {data.length > 0 && (
            <>
              <div className="mb-8">
                <h3 className="text-2xl  text-[#0C0D06] mb-6 ">
                  {t("fvrtBrand")}
                </h3>
              </div>{" "}
              <Swiper
                modules={[Navigation, Keyboard]}
                centeredSlides={false}
                slidesPerView={1}
                spaceBetween={24}
                loop={true}
                className=""
                keyboard={{
                  enabled: true,
                  onlyInViewport: true,
                  pageUpDown: true,
                }}
                breakpoints={{
                  320: {
                    slidesPerView: 2,
                    spaceBetween: 24,
                  },

                  560: { spaceBetween: 24, slidesPerView: 3 },

                  768: {
                    slidesPerView: 4,
                    spaceBetween: 32,
                  },

                  1120: {
                    slidesPerView: 3.8,
                    spaceBetween: 32,
                  },

                  1340: {
                    slidesPerView: 4,
                    spaceBetween: 32,
                  },
                  1600: {
                    slidesPerView: 4,
                    spaceBetween: 32,
                  },
                }}
                ref={swiperRef}
                navigation={{
                  prevEl: prevRef.current,
                  nextEl: nextRef.current,
                }}
                onSlideChange={handleSlideChange}
                onBeforeInit={(swiper) => {
                  if (typeof swiper.params.navigation !== "boolean") {
                    swiper.params.navigation.prevEl = prevRef.current;
                    swiper.params.navigation.nextEl = nextRef.current;
                  }
                }}
              >
                {data.map((item, index) => {
                  return (
                    <SwiperSlide key={index}>
                      <div
                        // href={item.affilationLink}
                        key={index}
                        className={`bg-white w-fit h-fit relative ${(loadingBrandShare[item.id] || loadingBrandShare[item._id]) ? "opacity-50 pointer-events-none" : ""}`}
                        target="_blank"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShareCampaign(item);
                        }}
                      >
                        <div className="relative w-[150px] h-[150px] lg:h-[300px] lg:w-[300px] aspect-square">
                          <Image
                            src={getOptimizedUrl(item.img || "/fallback-image.jpg", 600)}
                            fill
                            alt={item.name || "Campaign Image"}
                            className="rounded-2xl object-cover cursor-pointer"
                            priority={index < 4}
                            sizes="(max-width: 768px) 150px, 300px"
                          />
                        </div>

                        <div className="pt-4">
                          <p className="text-sm font-bold text-left lg:text-left leading-6 text-[#0C0D06]">
                            {item.brand || "Unknown Brand"}
                          </p>
                        </div>
                        {user?.onboardedDetails?.supabaseId === id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFavoriteClick(item?.id, "remove");
                            }}
                            className="absolute right-2 top-2 bg-gray-400 rounded-full w-[22px] h-[22px]"
                          >
                            <span className="!p-1 block">
                              <IconsLibrary name={"MenuCloseToogle"} />
                            </span>
                          </button>
                        )}
                      </div>
                    </SwiperSlide>
                  );
                })}
              </Swiper>
              <div
                className={`flex items-center justify-center md:justify-between w-full pt-4`}
              >
                <div className="flex gap-2 ">
                  {data.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToSlide(index)}
                      className={`w-2 h-2 rounded-full  ${
                        activeIndex === index
                          ? "bg-[var(--textColor)]"
                          : "bg-[var(--textColor)]/20"
                      }`}
                    ></button>
                  ))}
                </div>

                <div
                  className={`relative justify-between items-center gap-2 hidden lg:flex w-fit`}
                >
                  <button
                    ref={prevRef}
                    className="bg-[#F26915ED] border-[#F26915ED] border rounded-full cursor-pointer w-12 h-12 !flex justify-center items-center"
                  >
                    <IconsLibrary name="whiteArrow" />
                  </button>
                  <button
                    ref={nextRef}
                    className="bg-[#F26915ED]  border-[#F26915ED] border rounded-full w-12 h-12 cursor-pointer !flex justify-center items-center -scale-x-100"
                  >
                    <IconsLibrary name="whiteArrow" />
                  </button>
                </div>
              </div>
            </>
          )} */}

          {/* Favorite Products Section */}
          <div className="mb-5 mt-[63px] lg:mt-[80px]">
            {favoriteProducts.length > 0 && (
              <div className="mb-12">
                <h3 className="text-2xl text-[#0C0D06] mb-6 ">
                  {t("fvrtProducts")}
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                  {favoriteProducts.map((favorite, i) => {
                    const product = favorite.productData;
                    const resolvedBrand = favorite?.resolvedBrand;
                    const productId =
                      product?.shopifyProductId || favorite.productId;
                    const isLoading = loadingProductShare[productId];

                    return (
                      <div
                        key={i}
                        onClick={() =>
                          !isLoading && handleShareProduct(favorite)
                        }
                        className={`cursor-pointer ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
                      >
                        <ProductCard
                          key={favorite._id}
                          favorite={{...favorite, isPriority: i < 4}}
                          product={product}
                          onRemove={onProductRemove}
                          resolvedBrand={resolvedBrand}
                          user={user}
                          id={id}
                          isLoading={isLoading}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </DefaultLayout>
    </section>
  );
};

/**
 * ProductCard component for displaying favorite products
 */
const ProductCard = ({
  favorite,
  product,
  onRemove,
  id,
  user,
  resolvedBrand,
}) => {
  const [brandName, setBrandName] = useState("");
  const t = useTranslations("Sports.fvrt");
  const toastAlert = useTranslations("Sweetalert");

  // Fallback brand when API doesn't provide it
  const displayBrand = product?.resolvedBrand?.brandName || "N/A";
  const handleRemoveProduct = async (e) => {
    e.stopPropagation();
    try {
      const result = await Swal.fire({
        title: toastAlert("sure"),
        text: toastAlert("removeProducts"),
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: toastAlert("yes"),
        cancelButtonText: toastAlert("cancel"),
        customClass: {
          confirmButton: "confirmButton",
          cancelButton: "cancelButton",
        },
      });

      if (result.isConfirmed) {
        const response = await api.post("/favorite-product", {
          productId: favorite.productId,
          action: "remove",
        });

        if (response.success) {
          Swal.fire({
            title: toastAlert("productRemovedTxt"),
            position: "top-right",
            icon: "success",
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });

          // Refresh the products list
          if (onRemove) {
            onRemove();
          }
        }
      }
    } catch (error) {
      console.error("Remove product error:", error);
      Swal.fire({
        title: toastAlert("error"),
        text: toastAlert("errorRemove"),
        position: "top-right",
        icon: "error",
        toast: true,
        showConfirmButton: false,
        timer: 3000,
      });
    }
  };

  return (
    <div className="bg-white relative rounded-2xl">
      <div className="relative w-full aspect-square mb-4">
        <Image
          src={getOptimizedUrl(product.image || "/placeholder.jpg", 600)}
          fill
          alt={product.name || "Product"}
          className="rounded-2xl object-cover w-full"
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          priority={favorite?.isPriority}
        />
      </div>
      <div className="mt-2.5">
        {/* {displayBrand ? (
          <p className="text-sm text-[#0C0D06]/70 font-gothic">
            {displayBrand}
          </p>
        ) : null} */}
        <p className="text-base font-gothic text-[12px] text-center text-[#0C0D06] leading-[150%]">
          {resolvedBrand?.brandName || "Untitled Product"}
        </p>
        <p className="text-sm font-gothic text-center text-[#0C0D06] leading-[150%]">
          {product.name || "Untitled Product"}
        </p>
        <div className="text-[#0C0D06] text-center text-[12px] font-gothic text-lg leading-[150%] font-regular">
          {product.currency || "USD"}{" "}
                {Number.parseFloat(product.price || "0").toFixed(2)}
        </div>
        {user?.onboardedDetails?.supabaseId === id && (
          <>
            {/* Optionally enable product removal */}
            <button
              onClick={handleRemoveProduct}
              className="absolute right-2 top-2 bg-gray-400 rounded-full w-[22px] h-[22px]"
            >
              <span className="!p-1 block">
                <IconsLibrary name={"MenuCloseToogle"} />
              </span>
              {/* {t("remove")} */}
            </button>
          </>
        )}
        {/* <button
          onClick={handleRemoveProduct}
          className="w-full px-3 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-md text-sm font-medium transition-colors"
        >
          Remove from Profile
        </button> */}
      </div>
    </div>
  );
};

export default ShowFavourites;
