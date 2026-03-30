"use client";

import Image from "next/image";

export default function CampaignSlide({ cover, title, onClick }) {
  return (
    <div
      className="w-full p-0 relative aspect-square cursor-pointer"
      onClick={onClick}
    >
      <Image src={cover} alt={title} fill className="object-cover" />
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
        <h5 className="text-lg font-semibold line-clamp-1">{title}</h5>
      </div>
    </div>
  );
}
