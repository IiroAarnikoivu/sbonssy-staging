"use client";

import React from "react";
import Image from "next/image";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

/**
 * SquareImage
 * - Enforces a 1:1 aspect ratio using a square wrapper
 * - Uses next/image with fill + object-cover for consistent cropping
 *
 * Props:
 * - src: string | StaticImport (required)
 * - alt: string (required)
 * - className: string (optional) -> applied to the wrapper div
 * - imgClassName: string (optional) -> applied to the Image element
 * - priority: boolean (optional)
 * - sizes: string (optional)
 * - onClick: function (optional)
 * - rounded: string | boolean (optional) -> e.g., "rounded-xl"; if true, uses "rounded-2xl"
 */
export default function SquareImage({
  src,
  alt,
  className,
  imgClassName,
  priority = false,
  sizes,
  onClick,
  rounded,
}) {
  const roundedClass =
    typeof rounded === "string" ? rounded : rounded ? "rounded-2xl" : undefined;

  return (
    <div
      className={classNames(
        "relative aspect-square overflow-hidden",
        roundedClass,
        className
      )}
      onClick={onClick}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        className={classNames("object-cover", imgClassName)}
        draggable={false}
      />
    </div>
  );
}
