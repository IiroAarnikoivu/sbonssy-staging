import React, { memo, useState, useCallback } from 'react';
import { useTranslations } from "next-intl";
import Image from 'next/image';

const BrandFavouriteCard = memo(({ 
  item, 
  onViewClick, 
  onRemoveFavourite 
}) => {
  const t = useTranslations("Favourites");
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleRemoveClick = (e) => {
    e.preventDefault();
    onRemoveFavourite(item.id);
  };

  const handleViewClick = useCallback((e) => {
    e.preventDefault();
    onViewClick(item.item);
  }, [item.item, onViewClick]);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  const handleImageError = useCallback(() => {
    setImageError(true);
    setImageLoaded(true);
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <div className="relative">
        {!imageLoaded && (
          <div className="w-full aspect-square bg-gray-200 animate-pulse flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
          </div>
        )}
        <div className="w-full aspect-square relative">
          <Image
            src={imageError ? '/default-avatar.jpg' : item.avatar}
            alt={item.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            className={`object-cover cursor-pointer transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={handleViewClick}
            onLoad={handleImageLoad}
            onError={handleImageError}
            loading="lazy"
          />
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-xl font-semibold text-gray-800 mb-1 truncate">
          {item.name}
        </h3>

        <div className="mb-4">
          {item.subRole === "influencer" ? (
            <p className="text-gray-600 text-sm line-clamp-2">
              {item.goals}
            </p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {item.sportDisplay?.split(",").map((s, i) => (
                <span
                  key={i}
                  className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full"
                >
                  {s.trim()}
                </span>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex flex-col gap-2 mt-4">
          <button
            onClick={handleRemoveClick}
            className="secondaryBtnGray px-3 py-1.5"
          >
            {t("remove")}
          </button>

          <button
            onClick={handleViewClick}
            className="px-3 py-1.5 bg-[#390A21] text-white rounded-full w-full text-md"
          >
            {t("view")}
          </button>
        </div>
      </div>
    </div>
  );
});

BrandFavouriteCard.displayName = 'BrandFavouriteCard';

export default BrandFavouriteCard;
