"use client";

import React from "react";
import { useScrollAnimation } from "@/hook/useScrollAnimation";

/**
 * AnimatedSection wraps children with scroll-triggered animations.
 * Effects map to CSS combos defined in globals.css: scroll-fade-up, scroll-blur-in, scroll-scale-in, scroll-slide-left/right
 */
export default function AnimatedSection({
  effect = "fade-up",
  delay = 0,
  threshold = 0.15,
  className = "",
  children,
}) {
  const { ref, isVisible } = useScrollAnimation({ threshold, delay });

  const effectClass = (() => {
    switch (effect) {
      case "fade-up":
        return "scroll-fade-up";
      case "blur-in":
        return "scroll-blur-in";
      case "scale-in":
        return "scroll-scale-in";
      case "slide-left":
        return "scroll-slide-left";
      case "slide-right":
        return "scroll-slide-right";
      default:
        return "scroll-fade-up";
    }
  })();

  return (
    <div
      ref={ref}
      className={`${effectClass} ${
        isVisible ? "scroll-animate-visible" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
