"use client";

import Image from "next/image";

export default function AmbassadorSlide({ name, avatar, subRole, onClick }) {
  return (
    <div
      onClick={onClick}
      className="w-full aspect-square p-0 relative flex items-end cursor-pointer"
    >
      <Image src={avatar} alt={name} fill className="object-cover" />
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative w-full p-4 text-white">
        <h5 className="text-lg font-semibold line-clamp-1">{name}</h5>
        <p className="text-sm opacity-80 line-clamp-1 capitalize">{subRole}</p>
      </div>
    </div>
  );
}
