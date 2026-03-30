"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  initMixpanel,
  trackPageView,
  isMixpanelReady,
  optOutAndClear,
} from "@/lib/mixpanel";

export default function MixpanelTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const consentRef = useRef(null);

  useEffect(() => {
    const maybeTrack = () => {
      if (typeof window === "undefined") return;
      const c = consentRef.current;
      if (!c || !c.statistics) return; // track only if statistics consent
      if (!isMixpanelReady()) return;
      trackPageView(pathname, searchParams?.toString());
    };

    // Initialize from current consent state if CookieHub already loaded
    const bootstrapFromCurrentConsent = () => {
      try {
        const ch = typeof window !== "undefined" ? window.cookiehub : undefined;
        if (!ch) return;
        const c =
          typeof ch.getConsents === "function" ? ch.getConsents() : ch.consent;
        if (!c) return;
        const state = {
          statistics: !!(c.statistics ?? c["statistics"]),
        };
        consentRef.current = state;
        if (state.statistics) {
          initMixpanel().then(() => maybeTrack());
        } else {
          optOutAndClear();
        }
      } catch {
        // ignore
      }
    };

    // Track on route changes if ready and consented
    maybeTrack();

    // Listen for consent updates emitted by CookieHubConsent
    const onConsent = async (e) => {
      consentRef.current = e?.detail ?? null;
      if (consentRef.current?.statistics) {
        await initMixpanel();
      } else {
        // If statistics consent revoked, opt-out and clear any persistence
        optOutAndClear();
      }
      maybeTrack();
    };

    window.addEventListener("cookiehub:consent", onConsent);

    // Attempt to bootstrap immediately in case CookieHub is already loaded
    bootstrapFromCurrentConsent();

    return () => {
      window.removeEventListener("cookiehub:consent", onConsent);
    };
  }, [pathname, searchParams]);

  return null;
}
