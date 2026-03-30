"use client";
import { useAuthStore } from "@/store/authStore";
import React, { useEffect, useRef } from "react";

const Chat = () => {
  const { user } = useAuthStore();

  const scriptAddedRef = useRef(false); // Track if script is added

  useEffect(() => {
    if (typeof window === "undefined") return;

    // If already loaded once in this session, just show the widget
    if (document.getElementById("tawk-script") || scriptAddedRef.current) {
      if (window.Tawk_API?.showWidget) {
        window.Tawk_API.showWidget();
      }
      // Try updating attributes if possible
      if (
        user?.email &&
        typeof user.email === "string" &&
        window.Tawk_API?.setAttributes
      ) {
        window.Tawk_API.setAttributes(
          {
            name: user?.name || "guest",
            email: user.email,
          },
          () => {}
        );
      }
      return () => {
        if (window.Tawk_API?.hideWidget) window.Tawk_API.hideWidget();
      };
    }

    // Initialize Tawk globals
    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();

    const propertyId = process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID;
    const widgetId = process.env.NEXT_PUBLIC_TAWK_WIDGET_ID;
    const src = `https://embed.tawk.to/${propertyId}/${widgetId}`;

    const script = document.createElement("script");
    script.id = "tawk-script";
    script.async = true;
    script.src = src;
    script.charset = "UTF-8";
    script.setAttribute("crossorigin", "*");

    document.body.appendChild(script);
    scriptAddedRef.current = true;

    const onReady = () => {
      // Show widget
      if (window.Tawk_API?.showWidget) {
        window.Tawk_API.showWidget();
      }
      // Set visitor attributes if available
      if (
        user?.email &&
        typeof user.email === "string" &&
        window.Tawk_API?.setAttributes
      ) {
        try {
          window.Tawk_API.setAttributes(
            {
              name: user?.name || "guest",
              email: user.email,
            },
            () => {}
          );
        } catch (_) {
          // noop
        }
      }
    };

    // Handle immediate availability
    script.onload = () => {
      if (window.Tawk_API) {
        onReady();
        return;
      }

      // Fallback: wait for Tawk onLoad event
      window.Tawk_API = window.Tawk_API || {};
      window.Tawk_API.onLoad = onReady;

      // Extra safety: poll briefly
      let attempts = 0;
      const maxAttempts = 10;
      const interval = setInterval(() => {
        attempts += 1;
        if (window.Tawk_API) {
          clearInterval(interval);
          onReady();
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
        }
      }, 500);
    };

    script.onerror = () => {
      scriptAddedRef.current = false; // Allow retry on error
    };

    // Cleanup (avoid removing script): just hide the widget
    return () => {
      if (window.Tawk_API?.hideWidget) window.Tawk_API.hideWidget();
    };
  }, [user?.email, user?.name]);

  return <></>;
};

export default Chat;
