import React, { memo } from "react";
import { useTranslations } from "next-intl";
import { IoClose } from "react-icons/io5";
import Swal from "sweetalert2";
import { useAuthStore } from "@/store/authStore";
import Image from "next/image";

const FavouriteCard = memo(({ item, onViewClick, onRemoveFavourite }) => {
  console.log(item);
  const tt = useTranslations("Favourites");
  const toastAlert = useTranslations("Sweetalert");
  const { user } = useAuthStore();

  const handleRemoveClick = (e) => {
    e.preventDefault();
    if (user?.onboardedDetails?.permission === "Can View") {
      Swal.fire({
        title: toastAlert("denied"),
        text: toastAlert("permissionText"),
        icon: "info",
        showConfirmButton: true,
        timerProgressBar: false,
        timer: 5000,
      });
    } else {
      onRemoveFavourite(item.id);
    }
  };

  const handleViewClick = (e) => {
    e.preventDefault();
    onViewClick(item.id);
  };

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <div className="relative">
        <button
          onClick={handleRemoveClick}
          className="absolute top-4 right-4 bg-white/80 hover:bg-white rounded-full w-8 h-8 flex justify-center items-center shadow-sm border border-gray-200 transition-colors z-10"
        >
          <IoClose className="w-5 h-5 text-gray-600" />
        </button>
        <div className="w-full aspect-square relative">
          <Image
            src={item.image}
            alt={item.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            className="object-cover cursor-pointer"
            onClick={handleViewClick}
            loading="lazy"
          />
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-xl font-semibold text-gray-800 mb-1 truncate">
          {item.name}
        </h3>
      </div>
    </div>
  );
});

FavouriteCard.displayName = "FavouriteCard";

export default FavouriteCard;
