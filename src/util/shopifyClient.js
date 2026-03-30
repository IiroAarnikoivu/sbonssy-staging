// Lightweight client to call the sbonssy-shopify app Remix API routes
// Endpoints discovered:
// - /api/products -> actions: getProducts, syncProducts, purgeAll (others disabled)
// - /api/checkout -> create checkout: expects form fields { lines: JSON, note? }
//                     token only: { getStoreFrontTokenOnly: "true" }
// - /api/shop -> actions: getShopData(createToken?), checkConnection(shopDomain),
//                         connect(shopDomain), disconnect(shopDomain),
//                         checkEnv(), testDatabase(), connectWithUser(shopDomain, mainPlatformUserId)

class ShopifyClient {
  constructor({ baseUrl, fetchImpl } = {}) {
    if (!baseUrl) throw new Error("ShopifyClient requires a baseUrl");
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.fetch =
      fetchImpl ||
      (typeof window !== "undefined" ? window.fetch.bind(window) : fetch);
  }

  async _postForm(path, fields = {}) {
    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const form = new FormData();
    Object.entries(fields).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      // Strings only in FormData to match server expectations
      if (typeof v === "object") {
        form.append(k, JSON.stringify(v));
      } else {
        form.append(k, String(v));
      }
    });

    const res = await this.fetch(url, {
      method: "POST",
      body: form,
      headers: {
        "X-Sbonssy-Secret":
          typeof process !== "undefined"
            ? process.env.SBONSSY_INTERNAL_SECRET
            : undefined,
      },
    });

    // Try to parse standardized response { success, data | error }
    let json;
    try {
      json = await res.json();
      console.log("json", json);
    } catch (_) {
      const text = await res.text().catch(() => "");
      throw new Error(`Unexpected response from ${url}: ${res.status} ${text}`);
    }

    if (!json || typeof json !== "object") {
      throw new Error(`Invalid JSON from ${url}`);
    }
    if (json.success === false) {
      throw new Error(json.error || "Request failed");
    }
    return json.data;
  }

  // Products API: /api/products
  products = {
    get: async (opts = {}) => {
      const { page = 1, limit = 25 } = opts;
      return this._postForm("/api/products", {
        action: "getProducts",
        page,
        limit,
      });
    },
    sync: async () => {
      return this._postForm("/api/products", { action: "syncProducts" });
    },
    purgeAll: async () => {
      return this._postForm("/api/products", { action: "purgeAll" });
    },
  };

  // Checkout API: /api/checkout
  checkout = {
    createCheckout: async ({ lines, note, visitorId, campaign, athlete, shopUrl } = {}) => {
      if (!Array.isArray(lines) || lines.length === 0) {
        throw new Error("'lines' is required and must be a non-empty array");
      }
      // Server expects variant ids possibly in numeric or GID; server normalizes
      // Shape: [{ variantId: string|number, quantity: number }]
      return this._postForm("/api/checkout", {
        lines, // will be JSON.stringified in _postForm
        note,
        visitorId,
        campaign,
        athlete,
        shopUrl, // Add shopUrl to the form data
      });
    },
    getStorefrontToken: async (shopDomain) => {
      console.log("[STOREFRONT] Fetching storefront token for", shopDomain);
      return this._postForm("/api/checkout", {
        getStoreFrontTokenOnly: "true",
        shopUrl: shopDomain,
      });
    },
  };

  // Shop API: /api/shop
  shop = {
    getShopData: async ({ createToken = false } = {}) => {
      return this._postForm("/api/shop", {
        action: "getShopData",
        createToken: createToken ? "true" : "false",
      });
    },
    checkConnection: async ({ shopDomain }) => {
      if (!shopDomain) throw new Error("shopDomain is required");
      return this._postForm("/api/shop", {
        action: "checkConnection",
        shopDomain,
      });
    },
    connect: async ({ shopDomain }) => {
      if (!shopDomain) throw new Error("shopDomain is required");
      return this._postForm("/api/shop", {
        action: "connect",
        shopDomain,
      });
    },
    disconnect: async ({ shopDomain }) => {
      if (!shopDomain) throw new Error("shopDomain is required");
      return this._postForm("/api/shop", {
        action: "disconnect",
        shopDomain,
      });
    },
    checkEnv: async () => {
      return this._postForm("/api/shop", { action: "checkEnv" });
    },
    testDatabase: async () => {
      return this._postForm("/api/shop", { action: "testDatabase" });
    },
    connectWithUser: async ({ shopDomain, mainPlatformUserId }) => {
      if (!shopDomain) throw new Error("shopDomain is required");
      if (!mainPlatformUserId)
        throw new Error("mainPlatformUserId is required");
      return this._postForm("/api/shop", {
        action: "connectWithUser",
        shopDomain,
        mainPlatformUserId,
      });
    },
  };
}

// Simple factory
export function createShopifyClient({ baseUrl, fetchImpl } = {}) {
  return new ShopifyClient({ baseUrl, fetchImpl });
}

export default ShopifyClient;
