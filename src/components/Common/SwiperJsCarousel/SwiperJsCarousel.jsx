"use client";
import AmbassadorModal from "@/components/AmbassadorModal";
import SquareImage from "@/components/Common/SquareImage";
import { useAuthStore } from "@/store/authStore";
import IconsLibrary from "@/util/IconsLibrary";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { Autoplay, Keyboard, Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import DefaultLayout from "../DefaultLayout.jsx/DefaultLayout";

export default function SwiperJsCarousel({
  data,
  imgStyling,
  breakpoint,
  simpleCarousel,
  testimonial,
  ceoCards,
  slidesCount,
  slideSpace,
  swiperBtnStl,
  campaignBtnStyl,
  showImgContent,
  myCampCarousel,
  campaignCards,
  handleAction,
  darkBG,
  homePage = false,
  darkPagination,
}) {
  const { user } = useAuthStore();
  const prevRef = useRef(null);
  const nextRef = useRef(null);
  const router = useRouter();
  const [swiperReady, setSwiperReady] = useState(false);
  const swiperRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const t = useTranslations("Common");
  const toastAlert = useTranslations("Sweetalert");
  // Handle opening modal for a specific campaign
  const handleSelectAmbassador = (campaign) => {
    setSelectedCampaign(campaign);
    setIsModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCampaign(null);
  };
  useEffect(() => {
    setSwiperReady(true); // ensures refs are attached before rendering Swiper
  }, []);

  // Handle Swiper Slide Change
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

  // Autoplay control helpers
  const stopAutoplay = () => {
    if (swiperRef.current?.swiper?.autoplay) {
      swiperRef.current.swiper.autoplay.stop();
    }
  };

  const startAutoplay = () => {
    if (swiperRef.current?.swiper?.autoplay) {
      swiperRef.current.swiper.autoplay.start();
    }
  };

  // const TagName = simpleCarousel === "true" ? "div" : DefaultLayout;
  return (
    <div
      className="relative"
      tabIndex={0}
      onFocus={stopAutoplay}
      onBlur={startAutoplay}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          stopAutoplay();
        }
      }}
    >
      <Swiper
        modules={[Pagination, Navigation, Autoplay, Keyboard]}
        loop={true}
        breakpoints={breakpoint}
        freeMode={true}
        keyboard={{ enabled: true, onlyInViewport: true, pageUpDown: true }}
        autoplay={{
          delay: 1000,
          disableOnInteraction: true,
          pauseOnMouseEnter: true,
        }}
        speed={1000}
        // custom build
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
        slidesPerView={slidesCount}
        spaceBetween={slideSpace}
      >
        {data.map((i, index) => {
          return (
            <SwiperSlide key={index}>
              {ceoCards === true ? (
                <div className="w-[calc(100% - 20px)] lg:w-fit">
                  <div className="lg:w-[400px] h-[198px] lg:h-[395px] rounded-2xl overflow-hidden">
                    <Image
                      src={i.img || null}
                      width={400}
                      height={395}
                      alt={i.name}
                      className="rounded-2xl w-[100%] h-full object-cover lg:w-full"
                    />
                  </div>
                  <div className="my-4">
                    <b>{i.name}</b>
                    <p className="mb-4">{i.role}</p>
                    <p>{i.description}</p>
                  </div>
                  <div className="flex gap-3 text-sm mt-5 lg:mt-6">
                    <Link href={i.linkdin}>
                      <IconsLibrary name="linkdinSolidDark" />
                    </Link>

                    <Link href={i.x}>
                      <IconsLibrary name="XSolidDark" />
                    </Link>

                    <Link href={i.dribble}>
                      <IconsLibrary name="dribbleSolidDark" />
                    </Link>
                  </div>
                </div>
              ) : testimonial === true ? (
                <div className="flex flex-col items-center gap-6">
                  <Image
                    src={i.platformLogo}
                    alt={i.platformName}
                    width={80}
                    height={24}
                  />

                  <p className="text-xl text-center md:text-2xl font-medium text-black max-w-2xl">
                    “{i.quote}”
                  </p>
                  <div className="mt-4 text-center">
                    <div className="w-[56px] h-[56px] rounded-full bg-white flex justify-center items-center mx-auto">
                      <Image
                        src={i.companyLogo}
                        width={38}
                        height={38}
                        alt="..."
                      />
                    </div>
                    <div className="text-black text-lg font-semibold">
                      {i.author}
                    </div>
                    <div className="text-black text-sm">{i.position}</div>
                  </div>
                </div>
              ) : campaignCards === true ? (
                <div className="relative flex flex-col rounded-2xl overflow-hidden p-0 bg-white shadow-md w-full max-w-[304px] h-auto">
                  <div className="w-full aspect-square relative">
                    <img
                      src={i.img || "/placeholder.jpg"}
                      alt="campaign visual"
                      className="object-cover w-full h-full rounded-[16px] cursor-pointer"
                      onClick={() =>
                        router.push(
                          `/sports-ambassador-profile/${i.subRole}/${i.supabaseId}`
                        )
                      }
                    />
                  </div>
                  <div className="flex flex-col flex-1 pt-4 pb-2 px-4">
                    <div className="text-[18px] font-normal leading-[150%] text-[#0C0D06] mb-[6px] line-clamp-2">
                      {i?.title || "Ambassador Name"}
                    </div>
                    <div className="text-[14px] font-bold leading-[150%] text-[#0C0D06]">
                      {i?.brand}
                    </div>
                    <div className="text-[12px] font-normal leading-[150%] text-[#0C0D06] mt-1 mb-4">
                      {i?.campaignTitle}
                    </div>

                    {i.status === "pending" && (
                      <div className="flex flex-col gap-3 mt-auto">
                        <button
                          onClick={() => {
                            user.onboardedDetails.permission == "Can View"
                              ? Swal.fire({
                                  title: toastAlert("denied"),
                                  text: toastAlert("text"),
                                  icon: "error",
                                  position: "center",
                                  showConfirmButton: true,
                                  confirmButtonText: toastAlert("ok"),
                                  customClass: {
                                    confirmButton: "confirmButton",
                                    cancelButton: "cancelButton",
                                  },
                                  timerProgressBar: false,
                                  timer: 5000,
                                })
                              : handleAction(i._id, "accept");
                          }}
                          className="w-full bg-[#f26915] text-white rounded-full py-2 text-base cursor-pointer hover:bg-[#f26915] disabled:bg-gray-400"
                        >
                          {t("accept")}
                        </button>
                        <button
                          onClick={() => {
                            user.onboardedDetails.permission == "Can View"
                              ? Swal.fire({
                                  title: toastAlert("denied"),
                                  text: toastAlert("text"),
                                  icon: "error",
                                  position: "center",
                                  showConfirmButton: true,
                                  confirmButtonText: toastAlert("ok"),
                                  customClass: {
                                    confirmButton: "confirmButton",
                                    cancelButton: "cancelButton",
                                  },
                                  timerProgressBar: false,
                                  timer: 5000,
                                })
                              : handleAction(i._id, "decline");
                          }}
                          className="w-full bg-[#EDEDED] text-[#0C0D06] rounded-full py-2 text-base cursor-pointer hover:bg-[#D5D5D5]"
                        >
                          {t("decline")}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <SquareImage
                    src={i.img || null}
                    alt="img"
                    className="w-full max-w-[304px] cursor-pointer"
                    imgClassName={imgStyling}
                    sizes="(max-width: 640px) 100vw, 304px"
                    onClick={() => {
                      router.push("/marketplace");
                    }}
                  />
                  {showImgContent ? (
                    <p className="text-[18px]font-normal leading-6 text-[#0C0D06] mt-4">
                      {i?.title}
                    </p>
                  ) : null}
                  {showImgContent ? (
                    <h2 className="break-words text-[14px] !font-bold leading-6 text-[#0C0D06] mt-2 mb-2">
                      {i?.brand}
                    </h2>
                  ) : null}
                  {showImgContent ? (
                    <button
                      className="bg-[#0C0D060D] text-[##0C0D06] h-10 px-5  w-full text-center rounded-full"
                      onClick={() => handleSelectAmbassador(i)}
                    >
                      {t("select")}
                    </button>
                  ) : null}
                </div>
              )}
            </SwiperSlide>
          );
        })}
        {simpleCarousel && (
          <div
            className={`${swiperBtnStl} absolute z-10 justify-between items-center top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 hidden lg:flex ${
              testimonial ? "w-full" : "w-[95%]"
            }`}
          >
            <button
              ref={prevRef}
              className="bg-[#D7CED2] border-[#EBE6E8] border rounded-full cursor-pointer w-12 h-12 flex justify-center items-center"
            >
              <IconsLibrary name="arrow" />
            </button>
            <button
              ref={nextRef}
              className="bg-[#D7CED2] border-[#EBE6E8] border rounded-full w-12 h-12 cursor-pointer flex justify-center items-center -scale-x-100"
            >
              <IconsLibrary name="arrow" />
            </button>
          </div>
        )}
      </Swiper>
      {/* ------------- */}
      <DefaultLayout>
        <div
          className={`flex items-center mt-8 ${myCampCarousel} ${
            simpleCarousel === "true" ? "justify-center" : "justify-between"
          }`}
        >
          <div className="flex gap-2">
            {data.map((_, index) => {
              // check if we are in mobile
              const isMobile =
                typeof window !== "undefined" && window.innerWidth < 600;

              // if on mobile, only show prev, active, next
              if (
                isMobile &&
                index !== activeIndex &&
                index !== activeIndex - 1 &&
                index !== activeIndex + 1
              ) {
                return null;
              }

              return (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-200 ${
                    activeIndex === index
                      ? darkBG
                        ? "bg-white scale-125"
                        : "bg-[var(--textColor)] scale-125"
                      : darkBG
                      ? "bg-white/20"
                      : "bg-[var(--textColor)]/20"
                  }`}
                ></button>
              );
            })}
          </div>

          {simpleCarousel === "true" ? null : (
            <div className="flex items-center gap-4 justify-center">
              <button
                ref={prevRef}
                className={`${
                  ceoCards === "true" ? "bg-reddishPurple" : "bg-[#F1F1F1]"
                }  ${campaignBtnStyl} rounded-full cursor-pointer w-12 h-12 flex justify-center items-center`}
              >
                {ceoCards ? (
                  <IconsLibrary name="whiteArrow" />
                ) : (
                  <IconsLibrary name="arrow" />
                )}
              </button>
              <button
                ref={nextRef}
                className={`rounded-full w-12 h-12 cursor-pointer flex justify-center items-center -scale-x-100 ${
                  ceoCards === "true" ? "bg-reddishPurple" : "bg-[#F1F1F1]"
                } ${campaignBtnStyl}`}
              >
                {ceoCards ? (
                  <IconsLibrary name="whiteArrow" />
                ) : (
                  <IconsLibrary name="arrow" />
                )}
              </button>
            </div>
          )}
        </div>
        <AmbassadorModal
          isOpen={isModalOpen}
          onClose={closeModal}
          ambassadors={selectedCampaign?.ambassadors || []}
          campaignTitle={selectedCampaign?.title || "Campaign"}
        />
      </DefaultLayout>
    </div>
  );
}
