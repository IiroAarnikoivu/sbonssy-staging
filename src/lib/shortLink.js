import ShortLink from "@/models/ShortLink";

const BASE62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const CODE_LENGTH = 7;

function generateCode() {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += BASE62[Math.floor(Math.random() * BASE62.length)];
  }
  return code;
}

/**
 * Returns a short URL for the given longUrl.
 * Reuses an existing code if the longUrl was already shortened (deduplication).
 */
export async function createShortLink(longUrl, baseUrl) {
  const existing = await ShortLink.findOne({ longUrl }).lean();
  if (existing) {
    console.log("[createShortLink] Reusing existing code:", existing.code);
    return `${baseUrl}/s/${existing.code}`;
  }

  let code;
  let attempts = 0;
  while (attempts < 5) {
    code = generateCode();
    const conflict = await ShortLink.findOne({ code }).lean();
    if (!conflict) break;
    attempts++;
  }

  await ShortLink.create({ code, longUrl });
  console.log("[createShortLink] Created new code:", code, "for URL:", longUrl);
  return `${baseUrl}/s/${code}`;
}
