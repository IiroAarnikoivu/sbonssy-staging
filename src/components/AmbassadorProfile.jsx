"use client";

import { useSocket } from "@/context/SocketContext";
import { useCampaigns } from "@/hook/useCampaigns";
import useDebounce from "@/hook/useDebounce"; // Assuming the useDebounce hook is in this path
import useInterestsTranslations from "@/hook/useInterestsTranslations";
import useSportsTranslations from "@/hook/useSportsTranslations";
import useSubRoleTranslations from "@/hook/useSubRoleTranslations";
import api from "@/lib/axios";
import { toCamelCase, uploadToCloudinary } from "@/lib/helper";
import { useAuthStore } from "@/store/authStore";
import IconsLibrary from "@/util/IconsLibrary";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CiGlobe } from "react-icons/ci";
import { FaTiktok, FaYoutube } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import Swal from "sweetalert2";
import "swiper/css";
import "swiper/css/navigation";
import DefaultLayout from "./Common/DefaultLayout.jsx/DefaultLayout";
import CropperComponent from "./Cropper";
import Loader from "./Loader";
import ShowFavourites from "./ShowFavourites";

/**
 * Renders social media links for the athlete profile
 * @param {Object} socialMedia - Social media data
 * @returns {JSX.Element} Social media links component
 */
const SocialMediaLinks = ({ socialMedia }) => {
  return (
    <div className="flex justify-center items-center space-x-4 text-xl">
      {socialMedia?.instagram && (
        <Link target="_blank" href={`${socialMedia.instagram}`} className="flex items-center">
          <IconsLibrary name={"darkOutlineInstagram"} />
        </Link>
      )}
      {socialMedia?.facebook && (
        <Link target="_blank" href={`${socialMedia.facebook}`} className="flex items-center">
          <IconsLibrary name={"facebook"} />
        </Link>
      )}
      {socialMedia?.twitter && (
        <Link target="_blank" href={`${socialMedia.twitter}`} className="flex items-center">
          <FaXTwitter />
        </Link>
      )}
      {socialMedia?.website && (
        <Link target="_blank" href={socialMedia.website} className="flex items-center">
          <CiGlobe />
        </Link>
      )}
      {socialMedia?.tiktok && (
        <Link target="_blank" href={`${socialMedia.tiktok}`} className="flex items-center">
          <FaTiktok />
        </Link>
      )}
      {socialMedia?.youtube && (
        <Link target="_blank" href={`${socialMedia.youtube}`} className="flex items-center">
          <FaYoutube />
        </Link>
      )}
      {/* linkdinBlack */}
      {socialMedia?.linkedin && (
        <Link target="_blank" href={`${socialMedia.linkedin}`} className="flex items-center">
          <IconsLibrary name={"linkdinBlack"} />
        </Link>
      )}
    </div>
  );
};

/**
 * Renders profile tabs and content
 * @param {Object} props - Component props
 * @param {string} activeTab - Currently active tab
 * @param {Function} setActiveTab - Function to set active tab
 * @param {Object} subRoleData - Athlete sub-role data
 * @param {Function} t - Translation function
 * @returns {JSX.Element} Tabs component
 */
// const ProfileTabs = ({ activeTab, setActiveTab, subRoleData, t }) => {
//   const tabs = [
//     t("tabs.Biography"),
//     t("tabs.Achievements"),
//     t("tabs.Records"),
//     t("tabs.Goals"),
//   ];

//   const tabContent = useMemo(
//     () => ({
//       [t("tabs.Biography")]: (
//         <div
//           className="text-gray-700 space-y-4 mb-2"
//           title={subRoleData?.biography}
//         >
//           <p>
//             {subRoleData?.biography && subRoleData?.biography.length > 1000
//               ? subRoleData?.biography.slice(0, 1000) + "..."
//               : subRoleData?.biography || "No biography available."}
//           </p>
//         </div>
//       ),
//       [t("tabs.Achievements")]: (
//         <div className="text-gray-700 space-y-4 mb-2">
//           <p>{subRoleData?.achievements || "No achievements available."}</p>
//         </div>
//       ),
//       [t("tabs.Records")]: (
//         <div className="text-gray-700 space-y-4 mb-2">
//           <p>{subRoleData?.records || "No records available."}</p>
//         </div>
//       ),
//       [t("tabs.Goals")]: (
//         <div className="text-gray-700 space-y-4 mb-2">
//           <p>{subRoleData?.goals || "No goals available."}</p>
//         </div>
//       ),
//     }),
//     [subRoleData, t]
//   );

//   return (
//     <div className="w-full">
//       <div className="flex gap-2 xl:gap-8 border-b-2 border-gray-200 mb-4 overflow-x-auto">
//         {tabs.map((tab) => (
//           <button
//             key={tab}
//             onClick={() => setActiveTab(tab)}
//             className={`px-4 py-2 text-[20px] whitespace-nowrap ${
//               activeTab === tab
//                 ? "border-b-4 border-[#F26915] text-black"
//                 : "font-normal"
//             }`}
//           >
//             {tab}
//           </button>
//         ))}
//       </div>
//       <div className="mb-6">{tabContent[activeTab]}</div>
//     </div>
//   );
// };
const ProfileTabs = ({ activeTab, setActiveTab, subRoleData, t }) => {
  // Create tabs array only for items that have data
  const tabs = useMemo(() => {
    const availableTabs = [];

    if (subRoleData?.biography) {
      availableTabs.push(t("tabs.Biography"));
    }

    if (subRoleData?.achievements) {
      availableTabs.push(t("tabs.Achievements"));
    }

    if (subRoleData?.records) {
      availableTabs.push(t("tabs.Records"));
    }

    if (subRoleData?.goals) {
      availableTabs.push(t("tabs.Goals"));
    }

    return availableTabs;
  }, [subRoleData, t]);

  const tabContent = useMemo(() => {
    const content = {};

    if (subRoleData?.biography) {
      content[t("tabs.Biography")] = (
        <div
          className="text-gray-700 space-y-4 mb-2"
          title={subRoleData.biography}
        >
          <p className="text-justify break-words whitespace-pre-wrap">{subRoleData.biography}</p>
        </div>
      );
    }

    if (subRoleData?.achievements) {
      content[t("tabs.Achievements")] = (
        <div className="text-gray-700 space-y-4 mb-2">
          <p className="text-justify">{subRoleData.achievements}</p>
        </div>
      );
    }

    if (subRoleData?.records) {
      content[t("tabs.Records")] = (
        <div className="text-gray-700 space-y-4 mb-2">
          <p className="text-justify">{subRoleData.records}</p>
        </div>
      );
    }

    if (subRoleData?.goals) {
      content[t("tabs.Goals")] = (
        <div className="text-gray-700 space-y-4 mb-2">
          <p className="text-justify">{subRoleData.goals}</p>
        </div>
      );
    }

    return content;
  }, [subRoleData, t]);

  // If no tabs have data, don't render anything
  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      {/* <div className="flex mb-4 overflow-x-auto lg:justify-center">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-2 border-b-4 text-[20px] whitespace-nowrap px-2 xl:px-8 ${
              activeTab === tab
                ? "border-[#F26915] text-black"
                : "font-normal border-gray-200"
            }`}
          >
            {tab}
          </button>
        ))}
      </div> */}
      <div className="mb-6 max-w-[615.39px]">{tabContent[activeTab]}</div>
    </div>
  );
};
/**
 * AthleteProfile component displays a user's profile
 * @param {Object} params - The parameters object containing the profile ID
 * @param {string} params.id - The ID of the profile to display
 * @returns {JSX.Element} The rendered AthleteProfile component
 */
const getOptimizedUrl = (url, width = 800) => {
  if (typeof url !== "string" || !url.includes("cloudinary")) return url;
  if (url.includes("upload/")) {
    return url.replace("upload/", `upload/f_auto,q_auto,w_${width}/`);
  }
  return url;
};

/**
 * AthleteProfile component displays a user's profile
 * @param {Object} params - The parameters object containing the profile ID
 * @param {string} params.id - The ID of the profile to display
 * @returns {JSX.Element} The rendered AthleteProfile component
 */
const AthleteProfile = ({ id, subRole, initialDetails, initialCampaigns }) => {
  const { user } = useAuthStore();
  const t = useTranslations("Sports.profile");
  const toastAlert = useTranslations("Sweetalert");
  const router = useRouter();
  const translateSports = useSportsTranslations();
  const translateInterests = useInterestsTranslations();
  const translateSubRole = useSubRoleTranslations();
  const [swiperReady, setSwiperReady] = useState(false);
  const swiperRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const prevRef = useRef(null);
  const nextRef = useRef(null);

  const [state, setState] = useState({
    details: initialDetails || null,
    campaigns: (initialCampaigns || []).map((c, i) => ({
      ...c,
      isPriority: i < 4,
    })),
    loading: initialDetails ? false : true,
    error: null,
    favourites: [],
    favoriteProducts: [],
    loadingProducts: false,
    activeTab: t("tabs.Biography"),
    croppingImage: null,
    showFavourites: false,
    currentPage: 1,
  });

  const socket = useSocket();
  const [message, setMessage] = useState("");
  const [messageDetails, setMessageDetails] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const { handleFavoriteClick } = useCampaigns();

  const debouncedPage = useDebounce(state.currentPage, 300);
  const [pagination, setPagination] = useState({
    totalItems: null,
    totalPages: null,
  });

  useEffect(() => {
    setSwiperReady(true); // ensures refs are attached before rendering Swiper
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

  const validSubRoles = [
    "team",
    "athlete",
    "influencer",
    "coach",
    "exAthlete",
    "paraAthlete",
  ];

  /**
   * Fetches favorite profiles
   * @async
   */
  const getFavourites = useCallback(async () => {
    try {
      const favData = await api.get("/favourites");
      setState((prev) => ({
        ...prev,
        favourites: user?.role === "brand" ? favData?.data : favData?.data.data,
      }));
    } catch (error) {
      console.log("Error fetching favorites:", error);
    }
  }, [user?.role]);

  /**
   * Fetches favorite products
   * @async
   */
  const getFavoriteProducts = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loadingProducts: true }));
      const response = await api.get(`/favorite-product/${id}`);

      if (response.success) {
        setState((prev) => ({
          ...prev,
          favoriteProducts: (response.data || []).map((p, i) => ({
            ...p,
            isPriority: i < 4, // Mark first row as priority
          })),
          loadingProducts: false,
        }));
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        favoriteProducts: [],
        loadingProducts: false,
      }));
    }
  }, []);

  /**
   * Handles favorite toggle
   * @param {string} id - Profile ID
   * @async
   */
  const handleFavourites = useCallback(
    async (id) => {
      try {
        const resp = await api.post("/favourites", { id });
        if (resp?.success) {
          await getFavourites();
        }
      } catch (error) {
        console.error("Error handling favorites:", error);
      }
    },
    [getFavourites]
  );

  /**
   * Fetches profile details and campaigns
   * @async
   */
  const fetchProfileDetails = useCallback(async () => {
    // If we have initialDetails/Campaigns, we only need to fetch if we don't have them
    const needsProfile = !state.details && !initialDetails;
    const needsCampaigns = state.campaigns.length === 0 && (!initialCampaigns || initialCampaigns.length === 0);

    if (!needsProfile && !needsCampaigns) {
      setState((prev) => ({ ...prev, loading: false, error: null }));
      return; 
    }

    if (!state.details) {
      setState((prev) => ({ ...prev, loading: true, error: null }));
    } else {
      setState((prev) => ({ ...prev, error: null }));
    }

    try {
      const promises = [
        needsProfile ? api.get(`/user/${id}`) : Promise.resolve(null),
        needsCampaigns ? api.get(`/favorite-campaign?id=${id}`) : Promise.resolve(null),
      ];

      const [profileRes, campaignsRes] = await Promise.all(promises);

      setState((prev) => ({
        ...prev,
        details: profileRes && profileRes.data?.success ? profileRes.data.data : prev.details,
        campaigns: campaignsRes ? (campaignsRes.data?.data || []).map((c, i) => ({
          ...c,
          isPriority: i < 4,
        })) : prev.campaigns,
        loading: false,
        error: null,
      }));

      if (campaignsRes) {
        setPagination({
          totalItems: campaignsRes.data?.pagination?.totalItems || 0,
          totalPages: campaignsRes.data?.pagination?.totalPages || 1,
        });
      }
    } catch (error) {
      console.error("Error fetching profile data:", error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: t("errorLoadingProfile"),
      }));
    }
  }, [id, debouncedPage, t, initialDetails, initialCampaigns, state.details, state.campaigns.length]);

  /**
   * Handles file input for image upload
   * @param {Object} e - Event object
   */
  const handleFileChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const validTypes = ["image/jpeg", "image/png", "image/gif"];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!validTypes.includes(file.type)) {
        Swal.fire({
          title: toastAlert("error"),
          text: toastAlert("imageUploadError"),
          icon: "error",
          toast: true,
          position: "top-right",
          showConfirmButton: false,
          timer: 3000,
        });
        return;
      }

      if (file.size > maxSize) {
        Swal.fire({
          title: toastAlert("error"),
          text: toastAlert("imageSizeError"),
          icon: "error",
          toast: true,
          position: "top-right",
          showConfirmButton: false,
          timer: 3000,
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = () =>
        setState((prev) => ({ ...prev, croppingImage: reader.result }));
      reader.readAsDataURL(file);
    },
    [toastAlert]
  );

  /**
   * Handles crop completion
   * @param {File} croppedFile - Cropped image file
   * @async
   */
  const handleCropComplete = useCallback(
    async (croppedFile) => {
      try {
        if (!state.details) throw new Error("Profile details are undefined");

        const uploaded = await uploadToCloudinary({
          file: croppedFile,
          folder: "onboarding_photos",
        });

        const newImage = { ...uploaded, isProfile: true };
        const subRoleKey = toCamelCase(state.details?.subRole?.toLowerCase());

        if (!subRoleKey || !validSubRoles.includes(subRoleKey)) {
          throw new Error("Invalid subRole");
        }

        const subRoleData = state.details[subRoleKey] || {};
        const updatedImages = subRoleData.images
          ? [newImage, ...subRoleData.images.slice(1)]
          : [newImage];

        setState((prev) => ({
          ...prev,
          details: {
            ...prev.details,
            [subRoleKey]: {
              ...prev.details[subRoleKey],
              images: updatedImages,
            },
          },
        }));

        const body = {
          ...state.details,
          [subRoleKey]: {
            ...state.details[subRoleKey],
            images: updatedImages,
          },
        };

        const resp = await api.put("/user", body);
        if (resp?.success) {
          Swal.fire({
            title: toastAlert("imageUploadTitle"),
            position: "top-right",
            icon: "success",
            toast: true,
            showConfirmButton: false,
            timer: 3000,
          });

          setState((prev) => ({
            ...prev,
            details: resp.data?.data || prev.details,
          }));

          useAuthStore.setState((prev) => ({
            ...prev,
            user: {
              ...prev.user,
              onboardedDetails: {
                ...prev.user.onboardedDetails,
                [subRoleKey]: {
                  ...prev.user.onboardedDetails[subRoleKey],
                  images: updatedImages,
                },
              },
            },
          }));
        }
      } catch (error) {
        console.error("Error uploading image:", error);
        Swal.fire({
          title: toastAlert("error"),
          text: toastAlert("imageUploadErrorTxt"),
          icon: "error",
          toast: true,
          position: "top-right",
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        setState((prev) => ({ ...prev, croppingImage: null }));
      }
    },
    [state.details, toastAlert]
  );

  /**
   * Gets sub-role data
   * @returns {Object} Sub-role data
   */
  const getSubRoleData = useCallback(() => {
    const isInvited = !!state.details?.invitedBy;
    const rawSubRole = isInvited
      ? state.details?.invitedBy?.subRole
      : state.details?.subRole;
    const subRole = rawSubRole ? toCamelCase(rawSubRole.toLowerCase()) : null;

    if (subRole && validSubRoles.includes(subRole)) {
      return isInvited
        ? state.details?.invitedBy[subRole] || {}
        : state.details[subRole] || {};
    }
    return {};
  }, [state.details]);

  /**
   * Displays formatted sub-role
   * @returns {string} Formatted sub-role
   */
  const displaySubRole = useCallback(() => {
    const subRole = state.details?.subRole;
    if (subRole && validSubRoles.includes(toCamelCase(subRole.toLowerCase()))) {
      return translateSubRole(subRole);
    }
    return translateSubRole("athlete") || "Unknown Role";
  }, [state.details?.subRole, translateSubRole]);

  const subRoleData = useMemo(() => getSubRoleData(), [getSubRoleData]);
  const isFavorite = useMemo(
    () =>
      state?.favourites?.some(
        (fav) => fav.ambassadorId?._id === state.details?._id
      ),
    [state.favourites, state.details]
  );



  const getShareUrl = useCallback(async () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const user = state.details;
    if (!user) return "";

    // Use resolveAmbassadorSlug to handle duplicate names (e.g., iiro2)
    const { resolveAmbassadorSlug } = await import("@/util/resolveAmbassadorSlug");
    const slug = await resolveAmbassadorSlug(user);
    return slug ? `${origin}/ambassador/${slug}` : "";
  }, [state.details]);

  const handleShare = useCallback(async () => {
    try {
      const url = await getShareUrl();
      if (!url) {
        Swal.fire({
          title: "Unable to build profile link",
          position: "top-right",
          icon: "error",
          toast: true,
          showConfirmButton: false,
          timer: 3000,
        });
        return;
      }
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback: show manual copy dialog instead of using deprecated execCommand
        await Swal.fire({
          title: "Copy this link",
          input: "text",
          inputValue: url,
          inputAttributes: { readonly: true },
          confirmButtonText: "OK",
        });
      }
      Swal.fire({
        title: toastAlert("linkCopied"),
        position: "top-right",
        icon: "success",
        toast: true,
        showConfirmButton: false,
        timer: 2500,
      });
    } catch (err) {
      console.error("Failed to copy profile link:", err);
      Swal.fire({
        title: toastAlert("failedLink"),
        position: "top-right",
        icon: "error",
        toast: true,
        showConfirmButton: false,
        timer: 3000,
      });
    }
  }, [getShareUrl, toastAlert]);

  const carouselData = useMemo(
    () =>
      state.campaigns.map((campaign) => ({
        id: campaign._id,
        img: campaign.assets?.logos[0]?.url,
        title: campaign.basics?.title || "Default Campaign Title",
        brand: campaign.brandName || "Unknown Brand",
        affilationLink: campaign?.affilationLink,
      })) || [],
    [state.campaigns]
  );

  /**
   * Handles pagination page change
   * @param {number} selectedPage - The page to navigate to
   */
  const handlePageChange = useCallback((selectedPage) => {
    setState((prev) => ({ ...prev, currentPage: selectedPage }));
  }, []);

  useEffect(() => {
    getFavourites();
    // Fetch favorite products for sports ambassadors
    // if (user?.role === "sports-ambassador") {
    getFavoriteProducts();
    // }
  }, [getFavourites, getFavoriteProducts, user?.role]);

  useEffect(() => {
    fetchProfileDetails();
  }, [fetchProfileDetails]);

  // Join socket room when component mounts
  useEffect(() => {
    if (!socket) return;

    socket.emit("join-user-room", state.details?._id);

    return () => {
      socket.emit("leave-user-room", state.details?._id);
    };
  }, [socket, state.details?._id]);

  // Handle sending message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const tempId = `temp-${Date.now()}`;

    const newMessage = {
      senderId: user?.onboardedDetails?._id,
      receiverId: state?.details?._id,
      content: message.trim(),
      _id: tempId,
      timestamp: new Date(),
      read: false,
      attachment: null,
    };

    setIsSending(true);
    try {
      socket.emit("send-message", {
        senderId: newMessage.senderId,
        receiverId: newMessage.receiverId,
        content: newMessage.content,
        attachment: newMessage.attachment,
      });

      setMessage("");
      setMessageDetails(null);

      Swal.fire({
        title: toastAlert("messageSent"),
        position: "top-right",
        icon: "success",
        toast: true,
        showConfirmButton: false,
        timer: 3000,
      });
    } catch (error) {
      console.error("Error sending message:", error);
      Swal.fire({
        title: toastAlert("failedSendText"),
        position: "top-right",
        icon: "error",
        toast: true,
        showConfirmButton: false,
        timer: 3000,
      });
    } finally {
      setIsSending(false);
    }
  };

  // Open message modal
  const openMessageModal = () => {
    if (user?.onboardedDetails?.permission === "Can View") {
      Swal.fire({
        title: toastAlert("denied"),
        text: toastAlert("permissionText"),
        icon: "info",
        showConfirmButton: true,
        timerProgressBar: false,
        timer: 5000,
      });
      return;
    }

    setMessageDetails({
      id: state.details?._id,
      name: subRoleData?.name || "Athlete",
      role: state.details?.role,
    });
  };

  // Close message modal
  const closeMessageModal = () => {
    setMessageDetails(null);
    setMessage("");
  };

  if (state.loading) {
    return (
      <div className="flex justify-center items-center h-screen py-20">
        <Loader />
      </div>
    );
  }

  if (state.error) {
    return <div className="text-center py-20 text-red-500">{state.error}</div>;
  }

  const hasValues = Object.values(subRoleData?.socialMedia || {}).some(
    (val) => val !== ""
  );

  return (
    <div className="font-sans">
      {state.showFavourites ? (
        <ShowFavourites
          data={carouselData}
          favoriteProducts={state.favoriteProducts}
          loadingProducts={state.loadingProducts}
          onBack={() =>
            setState((prev) => ({ ...prev, showFavourites: false }))
          }
          pagination={{ ...pagination, currentPage: state.currentPage }}
          handlePageChange={handlePageChange}
          onProductRemove={getFavoriteProducts}
          id={id}
        />
      ) : (
        <>
          <div className="bg-white py-2 md:py-2 px-4 sm:px-8">
            {user?.id === id && (
              <div className="mb-4 md:mb-10 pt-8 md:pt-12">
                <DefaultLayout>
                  <div className="items-start">
                    <div>
                      <h2 className="text-[24px] text-[#0C0D06] font-normal mb-4 leading-6">
                        {t("subHeading")}
                      </h2>
                      <p className="text-[18px] font-normal mb-5 text-[#0C0D06]">
                        {t("para")}
                      </p>
                    </div>
                  </div>
                </DefaultLayout>
              </div>
            )}
            <DefaultLayout>
              <div className="flex flex-col  gap-[32px]">
                <div className="w-fit mx-auto pt-8 md:pt-12">
                  <div className="w-full relative max-w-[150px] mx-auto aspect-square">
                    {user?.role === "brand" && (
                      <button
                        onClick={() => handleFavourites(state.details?._id)}
                        className={`absolute top-2 right-2 z-10 text-2xl ${
                          isFavorite ? "text-blue-200" : "text-black"
                        }`}
                      >
                        <IconsLibrary
                          name={
                            isFavorite ? "star_profile_filled" : "star_profile"
                          }
                        />
                      </button>
                    )}

                    {state.croppingImage && (
                      <CropperComponent
                        image={state.croppingImage}
                        onCropComplete={handleCropComplete}
                        onCancel={() =>
                          setState((prev) => ({ ...prev, croppingImage: null }))
                        }
                      />
                    )}

                    {user?.id === id &&
                      user.onboardedDetails.permission !== "Can View" && (
                        <div className="absolute top-2 right-2 w-8 h-8 z-[10] rounded-full flex justify-center items-center bg-gray-200">
                          <label htmlFor="avatar" className="cursor-pointer">
                            <IconsLibrary
                              name="edit"
                              styling="size-4 text-textColor"
                            />
                          </label>
                          <input
                            className="hidden"
                            type="file"
                            id="avatar"
                            onChange={handleFileChange}
                          />
                        </div>
                      )}
                    <Image
                      src={getOptimizedUrl(
                        subRoleData?.images?.[0]?.url ||
                        "/assets/images/atheletProfile.png", 
                        600
                      )}
                      alt="Athlete"
                      width={512}
                      height={512}
                      className="w-full aspect-square object-cover rounded-[15px]"
                      priority
                      sizes="(max-width: 768px) 150px, 300px"
                    />
                  </div>

                  <div className="text-black text-center">
                    <h2 className="text-lg lg:text-[30px] py-[5px] font-regular capitalize mt-2">
                      {(subRole === "team" && subRoleData?.teamClubName
                        ? subRoleData?.teamClubName
                        : subRoleData?.name) || "Athlete name"}
                    </h2>
                    {subRoleData?.sports?.length > 0 ? (
                      <p className="text-sm text-[#635761]">
                        {translateSports(subRoleData.sports).join(", ")}
                      </p>
                    ) : (
                      <p className="text-sm text-[#635761]">
                        {subRole === "influencer"
                          ? displaySubRole()
                          : t("noSportsAvailable")}
                      </p>
                    )}
                    {subRole !== "influencer" && (
                      <p className="text-sm text-[#635761] font-(--font)">
                        {displaySubRole()}
                      </p>
                    )}
                    <p className="text-sm text-[#635761] mb-4">
                      {subRoleData?.location?.locationName || "Location"}
                    </p>

                    {/* Edit and Share buttons for profile owner */}
                    {/* Edit and Share buttons for profile owner */}
                    {user?.id === id && (
                      <div className="flex gap-2 justify-center mb-4">
                        {user?.onboardedDetails?.permission === "Can View" ? (
                          <button
                            className="bg-orange text-white py-2 px-5 rounded-full text-sm cursor-pointer transition whitespace-nowrap hover:bg-orange/90"
                            onClick={() => {
                              Swal.fire({
                                title: toastAlert("denied"),
                                text: toastAlert("permissionText"),
                                icon: "info",
                                showConfirmButton: true,
                                timerProgressBar: false,
                                timer: 5000,
                              });
                            }}
                          >
                            {t("edit")}
                          </button>
                        ) : (
                          <Link
                            href="/sports-ambassador/form"
                            className="bg-orange text-white py-2 px-5 rounded-full text-sm cursor-pointer transition textAlign-center whitespace-nowrap hover:bg-orange/90 flex items-center justify-center"
                            onMouseEnter={() => router.prefetch("/sports-ambassador/form")}
                          >
                            {t("edit")}
                          </Link>
                        )}
                        <button
                          className="bg-orange text-white py-2 px-5 rounded-full text-sm cursor-pointer transition whitespace-nowrap hover:bg-orange/90"
                          onClick={handleShare}
                        >
                          {t("share")}
                        </button>
                      </div>
                    )}

                    {user?.role === "brand" && (
                      <button
                        onClick={openMessageModal}
                        className="bg-orange-500 text-white px-6 py-2 rounded-full hover:bg-orange-600 transition mb-4 me-3"
                      >
                        {t("sendMessage")}
                      </button>
                    )}

                    <SocialMediaLinks socialMedia={subRoleData?.socialMedia} />
                  </div>
                </div>

                <div className="w-full lg:w-fit lg:max-w-[740px] mx-auto">
                  <ProfileTabs
                    activeTab={state.activeTab}
                    setActiveTab={(tab) =>
                      setState((prev) => ({ ...prev, activeTab: tab }))
                    }
                    subRoleData={subRoleData}
                    t={t}
                  />

                  {/* <div className="mt-[50px] xl:mt-[100px] flex flex-wrap gap-3">
                    {subRoleData?.interests?.map((tag, index) => (
                      <span
                        key={index}
                        className="bg-[#EBE6E8] text-[#390A21] px-6 py-2.5 rounded-lg text-base font-bold"
                      >
                        {translateInterests(tag)}
                      </span>
                    ))}
                  </div> */}
                </div>
              </div>
            </DefaultLayout>
          </div>
          <ShowFavourites
            data={carouselData}
            favoriteProducts={state.favoriteProducts}
            loadingProducts={state.loadingProducts}
            onBack={() =>
              setState((prev) => ({ ...prev, showFavourites: false }))
            }
            pagination={{ ...pagination, currentPage: state.currentPage }}
            handlePageChange={handlePageChange}
            onProductRemove={getFavoriteProducts}
            id={id}
            handleFavoriteClick={handleFavoriteClick}
          />

          <div className="bg-[#F26915] py-28 px-4 sm:px-8 text-white">
            <div className="max-w-7xl mx-auto flex flex-col xl:flex-row justify-between items-center sm:items-start gap-6">
              <h2 className="text-[44px] md:text-[56px] font-normal md:text-left">
                {t("boldtext")}
              </h2>
              <p className="text-lg font-normal md:text-justify max-w-xl">
                {t("subText")}{" "}
                {subRole === "team" && subRoleData?.teamClubName
                  ? subRoleData?.teamClubName
                  : subRoleData?.name?.split(" ")[0] || "Athlete"}{" "}
                {t("subText1")}
              </p>
            </div>
          </div>
        </>
      )}

      {/* Message Modal */}
      {messageDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">
                  {t("message")} {messageDetails.name}
                </h3>
                <button
                  onClick={closeMessageModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSendMessage}>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-3 border rounded-lg mb-4 min-h-[150px] bg-gr"
                  placeholder={t("placeholder")}
                  required
                  disabled={isSending}
                />

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeMessageModal}
                    className="px-4 py-2 rounded-lg bg-[#EBEDF0] "
                    disabled={isSending}
                  >
                    {t("cancel2")}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2  text-white rounded-lg bg-[#F26915] disabled:bg-[#F26915]"
                    disabled={isSending || !message.trim()}
                  >
                    {isSending ? `${t("sending")}` : `${t("send")}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AthleteProfile;

const CarouselBreakPoint = {
  320: { slidesPerView: 1.3, spaceBetween: 24 },
  640: { slidesPerView: 4, spaceBetween: 24 },
  1280: { slidesPerView: 4.5, spaceBetween: 32 },
  // 1560: { slidesPerView: 5, spaceBetween: 32 },
};
