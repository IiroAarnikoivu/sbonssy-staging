"use client";

import DefaultLayout from "@/components/Common/DefaultLayout.jsx/DefaultLayout";
import SwiperJsCarousel from "@/components/Common/SwiperJsCarousel/SwiperJsCarousel";
import { useAuthStore } from "@/store/authStore";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaEdit } from "react-icons/fa";
import Swal from "sweetalert2";

const SportsProfile = () => {
  const { user } = useAuthStore();
  const onboardedDetails = user?.onboardedDetails;
  const athlete = onboardedDetails?.athlete;
  const router = useRouter();
  const toastAlert = useTranslations("Sweetalert");

  return (
    <div>
      <div
        className="fixed  right-4 cursor-pointer"
        onClick={() => {
          user?.onboardedDetails?.permission === "Can view"
            ? Swal.fire({
                title: toastAlert("denied"),
                text: toastAlert("permissionText"),
                icon: "info",
                showConfirmButton: true,
                timerProgressBar: false,
                timer: 5000,
              })
            : router.push("/sports-ambassador/edit-profile");
        }}
      >
        <FaEdit className="w-10 h-10" />
      </div>
      <div>
        <h1>
          <b>Name:</b> {athlete?.name}
        </h1>
        <p>
          <b>Sub Role:</b> {onboardedDetails?.subRole}
        </p>
        {/* <p>{brand?.currentJobTitle}</p>
        <a href={brand?.websiteUrl} target="_blank">
          {brand?.websiteUrl}
        </a> */}
      </div>

      <button>Campaigns</button>
      {/* <div className="bg-amber-950">
        <Image
          alt="Logo"
          src={MobileLogo}
          width={54}
          height={54}
          className="block lg:hidden"
        />

        <Image
          alt="Logo"
          src={DesktopLogo}
          width={152}
          height={43}
          className="hidden lg:block"
        />
      </div> */}
      <div>
        <h1>My team</h1>
        <p>Built through shared goals. Backed by real partnerships</p>
        <button>View all</button>
        <DefaultLayout styling="py-[64px] lg:py-[112px]">
          <SwiperJsCarousel
            data={carouselContent}
            imgStyling="w-full h-[144px] object-cover  lg:w-[304px] lg:h-[304px] rounded-2xl"
            breakpoint={CarouselBreakPoint}
            simpleCarousel="true"
          />
        </DefaultLayout>
      </div>
      <div>
        <p>Shop</p>
        <h1>My campaigns</h1>
        <p>Explore the campaigns and make impact, every purchase matters!</p>
        <button>View all</button>
        <SwiperJsCarousel
          data={carouselContent}
          imgStyling="w-full h-[144px] object-cover  lg:w-[416px] lg:h-[416px] rounded-2xl"
          breakpoint={breakpoints}
        />
      </div>
    </div>
  );
};

export default SportsProfile;
const carouselContent = [
  { img: "/assets/images/dicoverCarousel/3.png" },
  { img: "/assets/images/dicoverCarousel/2.png" },
  { img: "/assets/images/dicoverCarousel/3.png" },
  { img: "/assets/images/dicoverCarousel/4.jpg" },
  { img: "/assets/images/dicoverCarousel/3.png" },
  { img: "/assets/images/dicoverCarousel/2.png" },
  { img: "/assets/images/dicoverCarousel/3.png" },
  { img: "/assets/images/dicoverCarousel/4.jpg" },
  { img: "/assets/images/dicoverCarousel/3.png" },
  { img: "/assets/images/dicoverCarousel/2.png" },
];
const CarouselBreakPoint = {
  320: {
    slidesPerView: 2.3,
    spaceBetween: 24,
  },

  640: {
    slidesPerView: 4.4,
  },

  1280: {
    spaceBetween: 32,
  },

  1600: {
    slidesPerView: 6.4,
    spaceBetween: 32,
  },
};

const breakpoints = {
  320: {
    slidesPerView: 2.5,
    spaceBetween: 24,
  },

  640: {
    slidesPerView: 2.5,
  },
  1200: {
    slidesPerView: 3.5,
    spaceBetween: 32,
  },
  1340: {
    slidesPerView: 3.5,
    spaceBetween: 32,
  },
  1600: {
    slidesPerView: 4.5,
    spaceBetween: 32,
  },
};
