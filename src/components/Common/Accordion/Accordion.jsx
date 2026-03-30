"use client";
import IconsLibrary from "@/util/IconsLibrary";
import React, { useEffect, useRef, useState } from "react";

/**
 * Accessible Accordion
 * - ARIA attributes and keyboard navigation
 * - Optional multi-open via allowMultiple
 * - Smooth Tailwind-based animation using CSS grid row trick (no JS height calc)
 */
export default function Accordion({
  data = [],
  allowMultiple = false,
  defaultIndex = 0,
  animationVisible = true, // Default to true if not using scroll animation
  getItemStyle = () => ({}),
}) {
  const buttonsRef = useRef([]);
  const [open, setOpen] = useState(() => {
    // All items closed by default (empty Set)
    return new Set();
  });

  const isOpen = (idx) => open.has(idx);

  const toggle = (idx) => {
    if (allowMultiple) {
      setOpen((prev) => {
        const next = new Set(prev);
        if (next.has(idx)) next.delete(idx);
        else next.add(idx);
        return next;
      });
    } else {
      // For single mode, but allow multiple items to remain open from initial state
      setOpen((prev) => {
        const next = new Set(prev); // Start with current state

        // Toggle the clicked item
        if (next.has(idx)) {
          next.delete(idx); // Close this item
        } else {
          next.add(idx); // Open this item
        }

        return next;
      });
    }
  };

  // Keyboard navigation: Up/Down/Home/End between headers
  const onKeyDown = (e, idx) => {
    const count = data.length;
    if (!count) return;
    let nextIndex = idx;
    switch (e.key) {
      case "ArrowDown":
        nextIndex = (idx + 1) % count;
        e.preventDefault();
        buttonsRef.current[nextIndex]?.focus();
        break;
      case "ArrowUp":
        nextIndex = (idx - 1 + count) % count;
        e.preventDefault();
        buttonsRef.current[nextIndex]?.focus();
        break;
      case "Home":
        e.preventDefault();
        buttonsRef.current[0]?.focus();
        break;
      case "End":
        e.preventDefault();
        buttonsRef.current[count - 1]?.focus();
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        toggle(idx);
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    // Ensure refs array length tracks data
    buttonsRef.current = buttonsRef.current.slice(0, data.length);
  }, [data.length]);

  // Update open state when data changes - keep all items closed by default
  useEffect(() => {
    if (data.length > 0) {
      // All items closed by default
      setOpen(new Set());
    }
  }, [data.length]);

  return (
    <div className="divide-y divide-[#0C0D0626]">
      {data.map((item, index) => {
        const panelId = `accordion-panel-${index}`;
        const headerId = `accordion-header-${index}`;
        const openNow = isOpen(index);
        return (
          <div 
            key={index} 
            className={`py-0 scroll-fade-up scroll-stagger-${index + 1} ${animationVisible ? 'scroll-animate-visible' : ''}`}
            style={getItemStyle(index)}
          >
            <button
              ref={(el) => (buttonsRef.current[index] = el)}
              id={headerId}
              aria-controls={panelId}
              aria-expanded={openNow}
              onClick={() => toggle(index)}
              onKeyDown={(e) => onKeyDown(e, index)}
              className="w-full flex justify-between items-center py-5 lg:py-[22.5px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f26915]"
            >
              <span className="text-left text-base lg:text-lg leading-[150%] font-bold">
                {item.title}
              </span>
              <IconsLibrary
                name="dropdown"
                styling={`h-5 w-5 transition-transform duration-300 fill-black ${
                  openNow ? "rotate-180" : "rotate-0"
                }`}
              />
            </button>

            {/* Animated content using grid-rows trick for smooth auto-height */}
            <div
              id={panelId}
              role="region"
              aria-labelledby={headerId}
              className={`grid transition-all duration-300 ease-in-out overflow-hidden ${
                openNow
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="min-h-0">
                <p className="text-base text-left text-[#0C0D06] leading-[150%] font-normal max-w-[768px] pb-5 lg:pb-6">
                  {item.content}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

