export const i18n = {
  defaultLocale: "en",
  locales: ["en", "fi"],
};

// Lazy-load messages to avoid bundling large JSON strings into the client bundle
// and to prevent webpack from serializing big strings into its file cache.
export async function loadMessages(locale) {
  const safeLocale = i18n.locales.includes(locale) ? locale : i18n.defaultLocale;
  try {
    const mod = await import(`../messages/${safeLocale}.json`);
    return mod.default;
  } catch (e) {
    const fallback = await import("../messages/en.json");
    return fallback.default;
  }
}
