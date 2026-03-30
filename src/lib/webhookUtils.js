import crypto from "crypto";

/**
 * Generate a secure random API key for webhook authentication
 * Format: wh_live_[32 random hex chars]
 */
export function generateApiKey() {
  const randomBytes = crypto.randomBytes(32);
  return `wh_live_${randomBytes.toString("hex")}`;
}

/**
 * Generate a secure webhook secret for HMAC signature verification
 * Format: whsec_[32 random hex chars]
 */
export function generateWebhookSecret() {
  const randomBytes = crypto.randomBytes(32);
  return `whsec_${randomBytes.toString("hex")}`;
}

/**
 * Generate HMAC SHA-256 signature for webhook payload
 * @param {Object|string} payload - The webhook payload
 * @param {string} secret - The webhook secret
 * @returns {string} The hex-encoded HMAC signature
 */
export function generateHmacSignature(payload, secret) {
  const payloadString =
    typeof payload === "string" ? payload : JSON.stringify(payload);
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payloadString);
  return hmac.digest("hex");
}

/**
 * Verify HMAC SHA-256 signature for webhook payload
 * @param {Object|string} payload - The webhook payload
 * @param {string} signature - The signature to verify
 * @param {string} secret - The webhook secret
 * @returns {boolean} True if signature is valid
 */
export function verifyHmacSignature(payload, signature, secret) {
  try {
    const expectedSignature = generateHmacSignature(payload, secret);
    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  } catch (error) {
    console.error("Signature verification error:", error.message);
    return false;
  }
}

/**
 * Extract and validate attribution data from webhook payload
 * @param {Object} payload - The webhook payload
 * @returns {Object|null} Extracted attribution data or null if invalid
 */
export function extractAttribution(payload) {
  try {
    const {
      attribution,
      customer,
      visitorId: payloadVisitorId,
      sessionId,
    } = payload;

    // Support multiple attribution formats
    const visitorId =
      payloadVisitorId ||
      customer?.visitorId ||
      attribution?.visitorId ||
      sessionId;
    const campaign = attribution?.campaign || attribution?.campaignId;
    const athlete = attribution?.athlete || attribution?.athleteId;

    if (!visitorId || !campaign || !athlete) {
      return null;
    }

    return {
      visitorId,
      campaign,
      athlete,
      sessionId: sessionId || visitorId,
    };
  } catch (error) {
    console.error("Attribution extraction error:", error.message);
    return null;
  }
}

/**
 * Validate webhook payload structure
 * @param {Object} payload - The webhook payload
 * @returns {Object} Validation result with isValid boolean and errors array
 */
export function validateWebhookPayload(payload) {
  const errors = [];

  // Required fields
  if (!payload.event) {
    errors.push("Missing required field: event");
  }

  if (!payload.orderId && !payload.transactionId) {
    errors.push("Missing required field: orderId or transactionId");
  }

  // Event-specific validation
  if (payload.event === "purchase" || payload.event === "lead") {
    if (!payload.amount || payload.amount <= 0) {
      errors.push("Purchase/lead events require a valid amount > 0");
    }
  }

  // Attribution validation
  const attribution = extractAttribution(payload);
  if (!attribution) {
    errors.push(
      "Missing or invalid attribution data (visitorId, campaign, athlete required)",
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    attribution,
  };
}

/**
 * Create idempotency key from payload
 * Used to prevent duplicate processing of the same webhook
 * @param {Object} payload - The webhook payload
 * @param {string} brandId - The brand's MongoDB ID
 * @returns {string} Idempotency key
 */
export function createIdempotencyKey(payload, brandId) {
  const identifier = payload.orderId || payload.transactionId || Date.now();
  const event = payload.event || "unknown";
  return `${brandId}_${event}_${identifier}`;
}

/**
 * Mask API key for safe display
 * @param {string} apiKey - The full API key
 * @returns {string} Masked API key (e.g., wh_live_abc...xyz)
 */
export function maskApiKey(apiKey) {
  if (!apiKey || apiKey.length < 16) {
    return "••••••••••••••••";
  }
  const prefix = apiKey.substring(0, 11); // "wh_live_abc"
  const suffix = apiKey.substring(apiKey.length - 3); // "xyz"
  return `${prefix}...${suffix}`;
}

/**
 * Parse user agent string to extract device info
 * @param {string} userAgent - The user agent string
 * @returns {Object} Parsed device information
 */
export function parseUserAgent(userAgent) {
  if (!userAgent) {
    return { deviceType: "unknown", browser: "unknown" };
  }

  const ua = userAgent.toLowerCase();

  // Device type detection
  let deviceType = "desktop";
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobile))/i.test(userAgent)) {
    deviceType = "tablet";
  } else if (
    /mobile|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
  ) {
    deviceType = "mobile";
  }

  // Browser detection
  let browser = "unknown";
  if (ua.includes("chrome")) browser = "Chrome";
  else if (ua.includes("safari")) browser = "Safari";
  else if (ua.includes("firefox")) browser = "Firefox";
  else if (ua.includes("edge")) browser = "Edge";
  else if (ua.includes("opera")) browser = "Opera";

  return { deviceType, browser };
}
