"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Custom hook for scroll-triggered animations using Intersection Observer
 *
 * @param {Object} options - Configuration options
 * @param {number} options.threshold - Visibility threshold (0-1), default 0.1
 * @param {string} options.rootMargin - Root margin, default "0px 0px -50px 0px"
 * @param {boolean} options.triggerOnce - Only trigger animation once, default true
 * @param {number} options.delay - Animation delay in ms, default 0
 *
 * @returns {Object} { ref, isVisible, animationClass }
 */
export function useScrollAnimation(options = {}) {
  const {
    threshold = 0.1,
    rootMargin = "0px 0px -50px 0px",
    triggerOnce = true,
    delay = 0,
  } = options;

  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (delay > 0) {
            setTimeout(() => {
              setIsVisible(true);
              setHasTriggered(true);
            }, delay);
          } else {
            setIsVisible(true);
            setHasTriggered(true);
          }

          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce && hasTriggered) {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, triggerOnce, delay, hasTriggered]);

  return { ref, isVisible };
}

/**
 * Hook for staggered animations on multiple children
 *
 * @param {number} itemCount - Number of items to animate
 * @param {Object} options - Configuration options
 * @param {number} options.staggerDelay - Delay between each item in ms, default 100
 * @param {number} options.threshold - Visibility threshold, default 0.1
 * @param {string} options.rootMargin - Root margin
 *
 * @returns {Object} { containerRef, isVisible, getItemStyle }
 */
export function useStaggeredAnimation(itemCount, options = {}) {
  const {
    staggerDelay = 100,
    threshold = 0.1,
    rootMargin = "0px 0px -50px 0px",
  } = options;

  const containerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(element);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin]);

  const getItemStyle = (index) => ({
    animationDelay: isVisible ? `${index * staggerDelay}ms` : "0ms",
  });

  const getItemClass = (index) => {
    return isVisible ? "scroll-animate-visible" : "scroll-animate-hidden";
  };

  return { containerRef, isVisible, getItemStyle, getItemClass };
}

export default useScrollAnimation;
