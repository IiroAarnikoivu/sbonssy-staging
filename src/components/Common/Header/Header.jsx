"use client";

import { useAuthStoreWithTranslations } from "@/store/authStoreHelpers";
import IconsLibrary from "@/util/IconsLibrary";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { useUIStore } from "@/store/uiStore";
import DefaultLayout from "../DefaultLayout.jsx/DefaultLayout";
import GlobalSearch from "../GlobalSearch/GlobalSearch";
import LanguageSwitcher from "../LanguageSwitcher/LanguageSwitcher";

/**
 * @component Header
 * @description
 * Responsive navigation header used throughout the app.
 * Displays logo, navigation menu, language switcher, search,
 * and handles user login/logout and dropdowns.
 * Hides when scrolling down and shows when scrolling up.
 * Uses click for submenus on mobile and hover on desktop.
 *
 * @returns {JSX.Element} Rendered Header component
 */
export default function Header() {
  const t = useTranslations("Header");
  const [showMenu, setShowMenu] = useState(true); // mobile menu toggle
  const [dropdown, setDropdown] = useState(0); // main nav dropdowns
  const [profileDropDown, setProfileDropDown] = useState(false); // profile dropdown toggle
  const [isHeaderVisible, setIsHeaderVisible] = useState(true); // header visibility
  const [lastScrollY, setLastScrollY] = useState(0); // track last scroll position
  const [showLanguageSwitcher, setShowLanguageSwitcher] = useState(false);
  const [isMobile, setIsMobile] = useState(false); // track if device is mobile
  const [hasScrolled, setHasScrolled] = useState(false); // track if user has scrolled
  const menuRef = useRef(null); // for profile dropdown
  const dropdownRef = useRef(null); // for profile dropdown
  const languageTriggerRef = useRef(null); // guest language icon trigger
  const languageDropdownRef = useRef(null); // guest language dropdown container
  const sidebarRef = useRef(null); // for mobile sidebar
  const router = useRouter();
  const pathname = usePathname();

  const { user, logout } = useAuthStoreWithTranslations();

  // Shared UI store for sidebar
  const { toggleSidebar } = useUIStore();

  // Determine when to hide nav content (e.g., onboarding screens)
  const hideContent =
    pathname !== "/onboarding/brand" &&
    pathname !== "/onboarding/sports-ambassador";

  // Detect mobile vs desktop based on window size
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 1150); // Matches min-[1150px] breakpoint
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  // Handle scroll to show/hide header and detect scroll position
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsHeaderVisible(false);
      } else if (currentScrollY < lastScrollY) {
        setIsHeaderVisible(true);
      }

      // Set hasScrolled to true if scrolled more than 50px
      setHasScrolled(currentScrollY > 50);

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Prefetch common routes
  useEffect(() => {
    router.prefetch("/");
  }, [router]);

  // Handle click outside to close profile dropdown and mobile sidebar
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Profile dropdown click-outside logic
      const clickOnAvatar =
        menuRef.current && menuRef.current.contains(e.target);
      const clickOnDropdown =
        dropdownRef.current && dropdownRef.current.contains(e.target);
      if (!clickOnAvatar && !clickOnDropdown) {
        setProfileDropDown(false);
      }

      // Menu click-outside logic (only for mobile when menu is open)
      if (isMobile && !showMenu) {
        const clickOnMenu =
          sidebarRef.current && sidebarRef.current.contains(e.target);
        if (!clickOnMenu) {
          setShowMenu(true); // Close menu
          setDropdown(0); // Close any open submenus
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMobile, showMenu]);

  // Close guest language dropdown on outside click
  useEffect(() => {
    if (!showLanguageSwitcher) return;
    const handleClickOutside = (e) => {
      const withinTrigger = languageTriggerRef.current?.contains(e.target);
      const withinDropdown = languageDropdownRef.current?.contains(e.target);
      if (!withinTrigger && !withinDropdown) {
        setShowLanguageSwitcher(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showLanguageSwitcher]);

  /**
   * Handles toggling mobile menu
   */
  const openMenu = () => {
    const newShowMenu = !showMenu;
    setShowMenu(newShowMenu);
    if (newShowMenu) setDropdown(0); // Close any open submenus when closing mobile menu

    // On mobile, close profile dropdown when opening main menu (showMenu false = menu open)
    if (isMobile && !newShowMenu) {
      setProfileDropDown(false);
    }
  };

  /**
   * Handles opening/closing dropdown menu for nav items
   * @param {number} value - Menu item id to toggle
   */
  const openDropdown = (value) => {
    if (isMobile) {
      // On mobile, toggle dropdown on click
      setDropdown(dropdown === value ? 0 : value);
    } else {
      // On desktop, open dropdown on hover
      setDropdown(value);
    }
  };

  /**
   * Handles closing dropdown on desktop when mouse leaves
   */
  const closeDropdown = () => {
    if (!isMobile) {
      setDropdown(0);
    }
  };

  /**
   * Closes the mobile sidebar and resets dropdown state
   */
  const closeSidebar = () => {
    if (isMobile) {
      setShowMenu(true); // true means closed for mobile menu
      setDropdown(0); // Close any open submenus
    }
  };

  /**
   * Handles logout functionality
   */
  const handleLogout = async () => {
    try {
      const resp = await logout();
      if (resp) {
        router.push("/");
      }
    } catch (error) {}
  };

  /**
   * Toggle user profile dropdown
   */
  const handleProfileDropdown = () => {
    const newProfileDropDown = !profileDropDown;
    setProfileDropDown(newProfileDropDown);

    // On mobile, close main menu when opening profile dropdown
    if (isMobile && newProfileDropDown) {
      setShowMenu(true); // true means closed for main menu
      setDropdown(0); // Close any open submenus
    }
  };

  // Navigation menu structure
  const Menu = [
    {
      id: 1,
      title: t("marketplace"),
      routes: "/marketplace",
    },
    {
      id: 2,
      child: "true",
      title: t("features"),
      submenu: [
        { id: 21, title: t("fans"), routes: "/fans" },
        { id: 22, title: t("sportsAmbassador"), routes: "/athletes-teams" },
        { id: 23, title: t("brand"), routes: "/brands" },
      ],
      routes: "/features",
    },
    {
      id: 3,
      child: "true",
      title: t("resources"),
      submenu: [
        { id: 31, title: t("news"), routes: "/help-center" },
        { id: 32, title: t("blog"), routes: "/blog" },
        { id: 33, title: t("faq"), routes: "/faq" },
      ],
      routes: "/resources",
    },
  ];

  // Profile dropdown options
  const userData = [
    {
      label: t("myAccount"),
      route: user?.role === "brand" ? `/brand` : "/sports-ambassador",
    },
    { label: t("settings"), route: `/${user?.role}/settings/general` },
    { label: t("support"), route: "/help-center" },
    {
      label: t("language"),
      component: (
        <LanguageSwitcher
          btnStyle={"py-2"}
          onLanguageSelected={() => setProfileDropDown(false)}
        />
      ),
    },
    { label: t("logout"), action: handleLogout },
  ];

  const getProfileImage = () => {
    if (user?.role === "brand") {
      // Prefer inviter's brand companyLogo if present
      const inviterLogo = user?.onboardedDetails?.invitedBy?.brand?.companyLogo;
      const ownLogo = user?.onboardedDetails?.brand?.companyLogo;

      return inviterLogo || ownLogo || "/assets/profilePic.png";
    }

    if (user?.role === "sports-ambassador") {
      const subRoleData = Object.values(user?.onboardedDetails || {}).find(
        (details) => Array.isArray(details?.images)
      );

      return (
        subRoleData?.images?.find((img) => img.isProfile)?.url ||
        "/assets/profilePic.png"
      );
    }

    return "/assets/profilePic.png";
  };

  if (pathname.includes("admin")) {
    return null;
  }

  // Determine if header should have black background
  // Use transparent background on hero pages, black background when scrolled or on other pages
  const pagesWithTransparentHeader = ["/fans", "/athletes-teams", "/brands", "/", "/features"];
  const shouldBeTransparent = pagesWithTransparentHeader.includes(pathname) && !hasScrolled;

  return (
    <React.Fragment>
      {/* Backdrop overlay for mobile menu */}
      {!showMenu && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-[49] min-[1150px]:hidden"
          onClick={() => {
            setShowMenu(true);
            setDropdown(0);
          }}
          aria-hidden="true"
        />
      )}

      <div
        className={`text-6xl w-full text-white left-0 z-80 fixed top-0 border-b lg:border-b-0 transition-all duration-300 ${
          isHeaderVisible ? "translate-y-0" : "-translate-y-full"
        } ${
          shouldBeTransparent
            ? "bg-transparent border-transparent py-1.5 lg:py-[14.5px]"
            : "bg-black border-black py-1 lg:py-2"
        }`}
      >
        <DefaultLayout styling={`overflow-visible w-full relative`}>
          <div
            className={`flex items-center justify-between overflow-hidden lg:overflow-visible`}
          >
            <div className="flex items-center">
              {/* Logo */}
              <Link href="/" className="cursor-pointer">
                {!user && (
                  <Image
                    alt="Logo"
                    src={"/assets/logo/mobileLogo.png"}
                    width={54}
                    height={54}
                    className="block min-[1150px]:hidden"
                  />
                )}
                <Image
                  alt="Logo"
                  src={"/assets/logo/desktopLogo.png"}
                  width={152}
                  height={43}
                  className="hidden min-[1150px]:block"
                  priority
                />
              </Link>

              {/* Hamburger menu for mobile (only when logged in) - opens left sidebar */}
              {user && (
                <div
                  className="cursor-pointer flex items-center justify-center min-[1150px]:hidden"
                  onClick={toggleSidebar}
                  aria-label="Open sidebar"
                >
                  <IconsLibrary name="MenuToggle" />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-8">
              {/* Hamburger menu for mobile (only when not logged in) */}
              {!user && (
                <div
                  className="cursor-pointer flex items-center justify-center min-[1150px]:hidden"
                  onClick={openMenu}
                  aria-label="Open menu"
                >
                  <IconsLibrary name="MenuToggle" />
                </div>
              )}

              {/* Menu (desktop & mobile) */}
              {hideContent ? (
                <div
                  ref={sidebarRef}
                  className={`fixed top-0 p-4 right-0 lg:max-w-[calc(100vw_-_140px)] transition-all duration-300 h-screen bg-black/50 backdrop-blur-xl text-white ${
                    showMenu ? "translate-x-full hidden" : "block translate-x-0"
                  } | min-[1150px]:relative min-[1150px]:p-0 min-[1150px]:w-fit min-[1150px]:h-fit min-[1150px]:bg-transparent min-[1150px]:backdrop-blur-none min-[1150px]:translate-x-0 z-50 min-[1150px]:block ${
                    isHeaderVisible ? "" : "!top-[61px] lg:!top-0"
                  }`}
                >
                  <h6 className="text-2xl text-white mb-6 min-[1150px]:hidden">
                    Menu
                  </h6>

                  <div
                    className="w-8 h-8 absolute cursor-pointer right-4 top-4 min-[1150px]:hidden"
                    onClick={openMenu}
                    aria-label="Close menu"
                  >
                    <IconsLibrary name="MenuCloseToogle" />
                  </div>

                  <ul className="flex flex-col gap-0 min-[1150px]:gap-8 min-[1150px]:flex-row">
                    {Menu.map((i, index) => (
                      <li
                        key={index}
                        className="group min-[1150px]:relative border-b py-4 border-white/20 min-[1150px]:border-0"
                        onMouseEnter={() =>
                          !isMobile && i.child && openDropdown(i.id)
                        }
                        onMouseLeave={() =>
                          !isMobile && i.child && closeDropdown()
                        }
                      >
                        <div
                          onClick={() => {
                            if (isMobile && i.child) {
                              openDropdown(i.id);
                            }
                          }}
                          className="cursor-pointer flex gap-1 justify-between items-center min-[1150px]:justify-start"
                        >
                          <Link
                            href={i.routes || "#"}
                            className="w-full h-full"
                            onClick={(e) => {
                              if (isMobile && i.child) {
                                e.preventDefault();
                                openDropdown(i.id);
                              } else {
                                closeSidebar();
                              }
                            }}
                          >
                            {i.title}
                          </Link>
                          {i.child && (
                            <div className="mr-6 lg:mr-0">
                              <IconsLibrary name="dropdown" />
                            </div>
                          )}
                        </div>

                        {i.child === "true" && (
                          <ul
                            className={`overflow-hidden transition-all duration-300 min-[1150px]:max-h-60 ${
                              dropdown === i.id ? "max-h-60" : "h-0 max-h-[0]"
                            } | min-[1150px]:p-4 min-[1150px]:bg-black/30 min-[1150px]:backdrop-blur-xl min-[1150px]:rounded-2xl min-[1150px]:shadow-orange-100 min-[1150px]:absolute min-[1150px]:min-w-[190px] ${
                              isMobile
                                ? ""
                                : "opacity-0 group-hover:opacity-100 group-hover:translate-y-0 -translate-y-5"
                            }`}
                          >
                            {i.submenu?.map((subMenu, index) => (
                              <li
                                key={index}
                                className="cursor-pointer first:mt-1 py-1"
                              >
                                <Link
                                  href={subMenu.routes}
                                  className="block w-full h-full py-1 hover:text-(--orange) transition-all duration-200"
                                  onClick={closeSidebar}
                                >
                                  {subMenu.title}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                                        {/* Settings link for mobile */}
                                        {user && (
                      <li className="lg:hidden border-b py-4 border-white/20">
                        <Link
                          href={`/${user?.role}/settings/general`}
                          className="block w-full h-full"
                          onClick={closeSidebar}
                        >
                          {t("settings")}
                        </Link>
                      </li>
                    )}

                    {/* Mobile-specific language switcher, search, and auth */}
                    <li className="lg:hidden pt-4 pb-3">
                      <LanguageSwitcher
                        textWhite={true}
                        onLanguageSelected={() => setShowMenu(false)}
                      />
                    </li>
                    <li className="lg:hidden">
                      <GlobalSearch />
                    </li>
                    <li className="lg:hidden">
                      {user ? (
                        <button
                          className="mt-4 primaryBtn py-1 bg-red-600 hover:bg-red-700"
                          onClick={() => {
                            handleLogout();
                            closeSidebar(); // Close sidebar when logging out
                          }}
                        >
                          {t("logout")}
                        </button>
                      ) : (
                        <div className="mt-4 flex items-center gap-2">
                          <Link
                            href="/authentication?tab=login"
                            className="flex-1 py-1 block text-center text-white hover:text-white/80 transition-colors"
                            onClick={closeSidebar}
                          >
                            {t("login")}
                          </Link>
                          <Link
                            href="/authentication"
                            className="flex-1 primaryBtn py-1 block text-center"
                            onClick={closeSidebar}
                          >
                            {t("signUp")}
                          </Link>
                        </div>
                      )}
                    </li>
                  </ul>
                </div>
              ) : null}

              {/* Authenticated user section */}
              {user ? (
                <>
                  <div className="gap-1.5 justify-end items-center min-[1150px]:flex-row-reverse min-[1150px]:gap-4 hidden lg:flex">
                    <div ref={menuRef} onClick={handleProfileDropdown}>
                      <div className="relative cursor-pointer">
                        <div className="rounded-full w-8 h-8 overflow-hidden">
                          <Image
                            width={32}
                            height={32}
                            className="bg-contain w-full h-full"
                            src={getProfileImage()}
                            alt="img"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Desktop-only utilities */}
                    <div className="hidden lg:block">
                      <GlobalSearch />
                    </div>
                  </div>

                  <button
                    className={`p-2 bg-transparent lg:hidden`}
                    onClick={(e) => {
                      e.preventDefault();
                      openMenu();
                    }}
                    aria-label="Toggle menu"
                  >
                    <div className="rounded-full w-8 h-8 overflow-hidden">
                      <Image
                        width={32}
                        height={32}
                        className="bg-contain w-full h-full"
                        src={getProfileImage()}
                        alt="img"
                      />
                    </div>
                  </button>
                </>
              ) : (
                // <div className="flex gap-1.5 justify-end items-center min-[1150px]:flex-row-reverse min-[1150px]:gap-4">
                //   <div ref={menuRef} onClick={handleProfileDropdown}>
                //     <div className="relative cursor-pointer">
                //       <div className="rounded-full border w-8 h-8 border-white overflow-hidden">
                //         <Image
                //           width={32}
                //           height={32}
                //           className="bg-contain w-full h-full"
                //           src={getProfileImage()}
                //           alt="img"
                //         />
                //       </div>
                //     </div>
                //   </div>

                //   {/* Desktop-only utilities */}
                //   <div className="hidden lg:block">
                //     <GlobalSearch />
                //   </div>
                // </div>
                // Guest user section
                <>
                  <div className="hidden lg:block">
                    <GlobalSearch />
                  </div>
                  <Link
                    href="/authentication?tab=login"
                    className="hidden lg:block text-white hover:text-white/80 transition-colors px-6 py-[7px] text-sm font-medium"
                  >
                    {t("login")}
                  </Link>
                  <Link
                    href="/authentication"
                    className="hidden lg:block primaryBtn"
                  >
                    {t("signUp")}
                  </Link>
                  <div
                    className="relative cursor-pointer hidden lg:block"
                    onClick={() => {
                      setShowLanguageSwitcher(!showLanguageSwitcher);
                    }}
                    ref={languageTriggerRef}
                    aria-label="Toggle language switcher"
                  >
                    <IconsLibrary name={"language"} />
                  </div>
                </>
              )}
            </div>
          </div>

          {!user && (
            <div
              className="absolute right-[90px] lg:right-[30px] [@media(min-width:1400px)]:right-0"
              ref={languageDropdownRef}
            >
              {showLanguageSwitcher && (
                <LanguageSwitcher
                  className="py-3 px-4 bg-white"
                  onLanguageSelected={() => setShowLanguageSwitcher(false)}
                />
              )}
            </div>
          )}

          {user && (
            <ul
              ref={dropdownRef}
              className={`absolute top-[50px] py-5 px-5 w-[180px] rounded-2xl -right-4 bg-white text-textColor transition-all duration-300 shadow-lg z-50 ${
                profileDropDown
                  ? "translate-x-[-30%] lg:translate-x-[-20%] block visible opacity-100"
                  : "invisible translate-x-[110%] opacity-0 hidden"
              }`}
            >
              {userData.map((item, index) => (
                <li
                  key={index}
                  className={`last:mb-0 cursor-pointer ${
                    item.label === "Language" || item.label === "Kieli"
                      ? "mb-[4px]"
                      : "mb-3"
                  }`}
                >
                  {item.component ? (
                    item.component
                  ) : item.route ? (
                    <Link
                      href={item.route}
                      className="block w-full h-full"
                      onClick={() => setProfileDropDown(false)}
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <div
                      className="block w-full h-full"
                      onClick={async () => {
                        try {
                          if (item.action) {
                            await item.action();
                          }
                        } finally {
                          setProfileDropDown(false);
                        }
                      }}
                    >
                      {item.label}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </DefaultLayout>
      </div>
    </React.Fragment>
  );
}
