// Utility helpers for Dashboard

export function getAmbassadorDisplay(a, t) {
  const name =
    a?.athlete?.name ||
    a?.team?.name ||
    a?.influencer?.name ||
    a?.coach?.name ||
    a?.exAthlete?.name ||
    a?.paraAthlete?.name ||
    a?.email ||
    (typeof t === "function" ? t("ambassadorLabel") : "Ambassador");
  const avatar =
    a?.athlete?.images?.[0]?.url ||
    a?.team?.images?.[0]?.url ||
    a?.influencer?.images?.[0]?.url ||
    a?.coach?.images?.[0]?.url ||
    a?.exAthlete?.images?.[0]?.url ||
    a?.paraAthlete?.images?.[0]?.url ||
    a?.images?.[0]?.url ||
    "/assets/images/whoisthis.png";
  const subRole = a?.subRole || "sports-ambassador";
  return { name, avatar, subRole };
}

export function getCampaignCover(c) {
  return (
    c?.assets?.logos?.[0]?.url ||
    c?.basics?.coverImages?.[0]?.url ||
    "/assets/images/whoisthis.png"
  );
}

export function getShopifyTargetUrl(
  user,
  stateShopifyUrl,
  preferSigned = false
) {
  const shopifyDetails = user?.onboardedDetails?.brand?.shopifyDetails;
  const shopName = shopifyDetails?.myShopifyDomain?.split(".")?.[0];
  const appName = process.env.NEXT_PUBLIC_SHOPIFY_APP_NAME;
  const fallbackComputed =
    shopName && appName
      ? `https://admin.shopify.com/store/${shopName}/apps/${appName}/app`
      : undefined;
  const hardcodedFallback =
    "https://admin.shopify.com/store/sbonssy-dev/apps/sbonssy-1/app";
  const preferred = preferSigned ? stateShopifyUrl : undefined;
  return preferred || stateShopifyUrl || fallbackComputed || hardcodedFallback;
}
