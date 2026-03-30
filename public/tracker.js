(function () {
  const BASE_URL = window.location.origin.includes("localhost")
    ? "http://localhost:5200"
    : "https://sbonssy.com";

  window.sbonssyTrack = {
    track: async function (eventType, data) {
      try {
        return await fetch(`${BASE_URL}/api/click`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            campaignId: data.campaignId,
            athleteId: data.athlete,
            visitorId: data.visitorId,
            eventType: eventType || "click",
            brandId: data.brandId,
            // Optional product attribution
            productId: data.productId,
            productHandle: data.productHandle,
            productName: data.productName,
          }),
        });
      } catch (error) {
        console.error("Error in track:", error);
        throw error;
      }
    },
    trackConversion: async function (eventName, data) {
      try {
        return await fetch(`${BASE_URL}/api/postback`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            event: eventName,
            campaign: data.campaignId,
            athlete: data.athlete,
            visitorId: data.visitorId,
            amount: data.amount,
            currency: data.currency || "EUR",
            transactionId: data.transactionId,
            // Optional product attribution
            productId: data.productId,
            productHandle: data.productHandle,
            productName: data.productName,
          }),
        });
      } catch (error) {
        console.error("Error in trackConversion:", error);
        throw error;
      }
    },
    // Convenience method to send a refund for pay-per-sale returns.
    // Required: campaignId, athlete, visitorId, transactionId (of original purchase)
    // Optional: amount (sale amount if you want to override/partial refund)
    refund: function (data) {
      return this.trackConversion("refund", data);
    },
  };

  // Automatically track page load click if parameters are present
  const urlParams = new URLSearchParams(window.location.search);
  const campaignId = urlParams.get("campaign");
  const athleteId = urlParams.get("athlete");
  let visitorId = urlParams.get("visitorId");

  // Store campaign and athlete in localStorage for cross-page tracking
  if (campaignId) {
    localStorage.setItem("sbonssy_campaign", campaignId);
  }
  if (athleteId) {
    localStorage.setItem("sbonssy_athlete", athleteId);
  }

  if (!visitorId) {
    visitorId = localStorage.getItem("sbonssy_visitor_id");
    if (!visitorId) {
      visitorId = `VIS_${Array.from(crypto.getRandomValues(new Uint8Array(4)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")}`;
      localStorage.setItem("sbonssy_visitor_id", visitorId);
    }
  }

  if (campaignId && athleteId && visitorId) {
    window.sbonssyTrack
      .track("click", {
        campaignId,
        athleteId,
        visitorId,
        brandId:
          document.currentScript?.getAttribute("data-brand") || "unknown",
        // If merchant embeds per-product script tags, these can optionally be set
        productId:
          document.currentScript?.getAttribute("data-product-id") || undefined,
        productHandle:
          document.currentScript?.getAttribute("data-product-handle") ||
          undefined,
        productName:
          document.currentScript?.getAttribute("data-product-name") ||
          undefined,
      })
      .then((response) => response.json())
      .then((data) => {})
      .catch((error) => {
        console.error("Error tracking click:", error.message);
      });
  }
})();
