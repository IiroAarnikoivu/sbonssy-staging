// lib/mixpanel.js
// Lazy-load mixpanel-browser only after consent to avoid pre-consent storage.

const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;

let mixpanel = null; // assigned after dynamic import
let mixpanelInitialized = false;
let loadingPromise = null;

export const initMixpanel = async () => {
  if (typeof window === "undefined" || mixpanelInitialized) return;
  if (!MIXPANEL_TOKEN) return; // nothing to init

  // ensure single loader
  if (!loadingPromise) {
    loadingPromise = import("mixpanel-browser").then((mod) => {
      mixpanel = mod.default || mod;
      mixpanel.init(MIXPANEL_TOKEN, {
        debug: process.env.NODE_ENV !== "production",
        track_pageview: false,
        // choose storage after consent; cookie/localStorage both fine since consent granted
        persistence: "cookie",
      });
      mixpanelInitialized = true;
    }).catch(() => {
      // swallow import/init errors to avoid crashing app
    });
  }
  return loadingPromise;
};

export const isMixpanelReady = () => mixpanelInitialized;

export const trackEvent = (eventName, properties = {}) => {
  if (typeof window !== "undefined" && mixpanelInitialized && mixpanel) {
    mixpanel.track(eventName, properties);
  }
};

export const trackPageView = (pathname, searchParams) => {
  if (typeof window !== "undefined" && mixpanelInitialized && mixpanel) {
    const url = `${pathname}${searchParams ? "?" + searchParams : ""}`;
    mixpanel.track("Page View", {
      page: url,
      title: document.title,
    });
  }
};

export const identifyUser = (userId) => {
  if (typeof window !== "undefined" && mixpanelInitialized && mixpanel) {
    mixpanel.identify(userId);
  }
};

export const setUserProperties = (properties) => {
  if (typeof window !== "undefined" && mixpanelInitialized && mixpanel) {
    mixpanel.people.set(properties);
  }
};

// Opt-out and clear persistence if consent is withdrawn
export const optOutAndClear = () => {
  if (typeof window !== "undefined" && mixpanel) {
    try {
      // Opt-out prevents further tracking and clears persistence when true
      mixpanel.opt_out_tracking(true);
    } catch {}
    try {
      // Reset distinct_id etc.
      mixpanel.reset();
    } catch {}
  }
};
