"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

export default function UserSearch({
  currentUser,
  searchQuery,
  setSearchQuery,
  setActiveChat,
}) {
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const t = useTranslations("Sports.chat");

  const getSearchRole = () => {
    if (currentUser.role === "brand") return "sports-ambassador";
    if (currentUser.role === "sports-ambassador") return "brand";
    return "";
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timerId = setTimeout(() => {
      searchUsers(searchQuery);
    }, 500);

    return () => clearTimeout(timerId);
  }, [searchQuery]);

  const searchUsers = async (query) => {
    setIsSearching(true);
    try {
      const searchRole = getSearchRole();
      const response = await fetch(
        `/api/users/search?query=${encodeURIComponent(
          query
        )}&role=${searchRole}`
      );
      if (!response.ok) throw new Error("Failed to search users");
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const getProfileImage = (user) => {
    if (user.role === "brand" && user.companyLogo) return user.companyLogo;
    if (user.images?.length > 0) {
      const profileImage = user.images.find((img) => img.isProfile);
      return profileImage?.url || user.images[0].url;
    }
    return null;
  };

  const getSubtitle = (user) => {
    switch (user.role) {
      case "brand":
        return user.companyName || "Brand";
      case "sports-ambassador":
        return `${user.sport || "Athlete"}${
          user.level ? ` • ${user.level}` : ""
        }`;
      case "team":
        return `${user.sports?.join(", ") || "Team"}${
          user.level ? ` • ${user.level}` : ""
        }`;
      default:
        return user.role;
    }
  };

  return (
    <div className="relative mt-4 px-2 sm:px-4">
      {/* Search Input */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder={
          currentUser.role === "brand"
            ? t("placeholderTxt1")
            : currentUser.role === "sports-ambassador"
            ? t("placeholderTxt2")
            : t("placeholderTxt3")
        }
        className="block w-full h-12 searchBrand bg-bgGraySmoke text-textColor placeholder-gray rounded-xl px-4 py-2 text-base font-sunset-gothic focus:ring-2 focus:ring-orange focus:border-transparent transition-colors duration-200"
        // aria-label="Search users"
      />

      {/* Search Results Dropdown */}
      {searchQuery && (
        <div className="absolute z-20 mt-2 w-full bg-white border border-gray rounded-lg shadow-tabCustom max-h-80 overflow-y-auto sm:max-w-md sm:left-4">
          {isSearching ? (
            <div className="p-4 text-center text-gray text-sm flex items-center justify-center">
              <div className="animate-spin inline-block h-5 w-5 border-t-2 border-b-2 border-orange-500 rounded-full"></div>
              <span className="ml-2">{t("searching")}</span>
            </div>
          ) : searchResults.length > 0 ? (
            searchResults.map((user) => {
              const profileImage = getProfileImage(user);
              return (
                <div
                  key={user._id}
                  className="p-3 hover:bg-bgGraySmoke cursor-pointer flex items-center border-b border-gray last:border-0 transition-colors duration-200"
                  onClick={() => {
                    setActiveChat({
                      id: user._id,
                      name: user.name,
                      role: user.role,
                      ...user,
                    });
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  role="button"
                  aria-label={`Select ${user.name}`}
                >
                  {profileImage ? (
                    <div className="w-10 h-10 rounded-full overflow-hidden mr-3 shrink-0">
                      <Image
                        src={profileImage}
                        width={40}
                        height={40}
                        alt={user.name}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray flex items-center justify-center mr-3 shrink-0">
                      <span className="text-textColor font-medium text-sm">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-textColor truncate text-sm">
                      {user.name}
                    </p>
                    <p className="text-xs text-gray truncate">
                      {getSubtitle(user)}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-4 text-center text-gray text-sm">{t("nou")}</div>
          )}
        </div>
      )}
    </div>
  );
}
