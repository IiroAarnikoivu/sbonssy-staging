"use client";

import Script from "next/script";
import { useEffect, useCallback } from "react";
import Cookies from "js-cookie";

// Configure via env; defaults provided
const SITE_ID = process.env.NEXT_PUBLIC_COOKIEHUB_ID || "da9eb9d8";
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "G-XXXX";
const CULTURE = process.env.NEXT_PUBLIC_COOKIEHUB_CULTURE || "en";

// Our own simple consent flag (optional, for other parts of the app)
const CONSENT_COOKIE = "sb_cookie_consent";

export default function CookieHubConsent() {
  /**
   * Sync gtag consent state based on current CookieHub state
   */
  const syncGtagConsent = useCallback((state) => {
    if (typeof window.gtag !== "function") return;
    
    window.gtag("consent", "update", {
      analytics_storage: state.statistics ? "granted" : "denied",
      ad_storage: state.marketing ? "granted" : "denied",
      ad_user_data: state.marketing ? "granted" : "denied",
      ad_personalization: state.marketing ? "granted" : "denied",
    });

    // Also update our internal cookie for consistency
    try {
      const value = state.preferences || state.statistics || state.marketing ? "accepted" : "declined";
      Cookies.set(CONSENT_COOKIE, value, { expires: 180, sameSite: "Lax", path: "/" });
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    /**
     * Set up hooks to listen for CookieHub events
     */
    const setupHooks = () => {
      const ch = window.cookiehub;
      if (!ch) return;

      // Signal ready for other components
      window.dispatchEvent(new Event("cookiehub:ready"));

      // If consent already exists, sync it immediately
      if (ch.consent) {
        syncGtagConsent(ch.consent);
      }

      // Listen for future consent changes
      if (typeof ch.on === "function") {
        ch.on("consent", (state) => {
          syncGtagConsent(state);
          window.dispatchEvent(new CustomEvent("cookiehub:consent", { detail: state }));
        });
      }
    };

    // If already loaded (e.g. from navigation), set up immediately
    if (window.cookiehub) {
      setupHooks();
    }

    // Poll for CookieHub to become available
    const poll = setInterval(() => {
      if (window.cookiehub) {
        clearInterval(poll);
        setupHooks();
      }
    }, 500);

    return () => clearInterval(poll);
  }, [syncGtagConsent]);

  return (
    <>
      {/* 1. Initialize Google Consent Mode (Denied by default) */}
      <Script id="gtag-consent" strategy="beforeInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('consent', 'default', {
          'analytics_storage': 'denied',
          'ad_storage': 'denied',
          'ad_user_data': 'denied',
          'ad_personalization': 'denied',
          'wait_for_update': 500
        });
      `}</Script>

      {/* 2. Load Google Tag Script */}
      <Script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />

      {/* 3. Configure Google Tag */}
      <Script id="gtag-config" strategy="afterInteractive">{`
        window.gtag('js', new Date());
        window.gtag('config', '${GA_ID}');
      `}</Script>

      {/* 4. Initialize CookieHub - Let it auto-initialize */}
      <Script id="cookiehub-config" strategy="beforeInteractive">{`
        window.cookiehub = window.cookiehub || {};
        window.cookiehub.culture = "${CULTURE}";
      `}</Script>

      {/* CookieHub script - only call load() if no consent cookie exists */}
      <Script
        id="cookiehub-script"
        src={`https://cdn.cookiehub.eu/c2/${SITE_ID}.js`}
        strategy="afterInteractive"
        onLoad={() => {
          if (!window.cookiehub || typeof window.cookiehub.load !== "function") return;
          
          // Check if CookieHub has already stored consent
          // CookieHub uses a cookie named 'cpm' to store consent preferences
          const hasCookieHubCookie = document.cookie.split(';').some(c => c.trim().startsWith('cpm='));
          
          if (!hasCookieHubCookie) {
            // First visit - initialize the widget
            window.cookiehub.load();
          } else {
            // Consent already exists - just trigger the ready event
            // CookieHub will auto-restore the consent state from its cookie
            setTimeout(() => {
              if (window.cookiehub.consent) {
                window.dispatchEvent(new Event("cookiehub:ready"));
              }
            }, 100);
          }
        }}
      />
    </>
  );
}
