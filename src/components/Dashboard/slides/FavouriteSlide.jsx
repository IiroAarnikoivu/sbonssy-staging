"use client";

import Image from "next/image";

export default function FavouriteSlide({ cover, title, subtitle, onClick }) {
  return (
    <div className="w-full p-0 relative aspect-square cursor-pointer" onClick={onClick}>
      <Image src={cover} alt={title} fill className="object-cover" />
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative w-full p-4 text-white">
        <h5 className="text-lg font-semibold line-clamp-1">{title}</h5>
        {subtitle ? (
          <p className="text-sm opacity-80 line-clamp-1">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}
