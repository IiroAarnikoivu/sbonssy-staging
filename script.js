(function () {
  // Use local API when running on localhost, otherwise use production API
  // const BASE_URL = window.location.origin.includes("localhost")
  //   ? "http://localhost:5200"
  //   : "https://sbonssy.icodestaging.in";

  const BASE_URL = window.location.origin.includes("localhost")
    ? "http://localhost:5200"
    : "https://sbonssy.com";

  // const BASE_URL = "http://localhost:5200";

  const urlParams = new URLSearchParams(window.location.search);

  // Helper to get params with fallbacks from URL then localStorage
  const getAttr = (urlKeys, lsKey) => {
    for (const key of urlKeys) {
      const val = urlParams.get(key);
      if (val) {
        if (lsKey) localStorage.setItem(lsKey, val);
        return val;
      }
    }
    return lsKey ? localStorage.getItem(lsKey) : null;
  };

  // Get campaign and athlete with broad fallbacks
  let campaign = getAttr(
    ["campaign", "utm_campaign", "sbonssy_campaign"],
    "sbonssy_campaign",
  );
  let athlete = getAttr(
    [
      "athlete",
      "utm_content",
      "ambassador",
      "ref",
      "sbonssy_athlete",
      "sbonssy_ambassador_id",
    ],
    "sbonssy_athlete",
  );

  // Get amount and transactionId with fallbacks
  const amountParam = getAttr(["amount", "sbonssy_amount"], "sbonssy_amount");
  const txnIdParam = getAttr(
    ["transactionId", "sbonssy_transaction_id", "sbonssy_transactionId"],
    "sbonssy_transaction_id",
  );

  const compType =
    urlParams.get("compType") || localStorage.getItem("sbonssy_comp_type");
  const productId =
    urlParams.get("productId") || localStorage.getItem("sbonssy_product_id");
  const productHandle =
    urlParams.get("productHandle") ||
    localStorage.getItem("sbonssy_product_handle");
  const productName =
    urlParams.get("productName") ||
    localStorage.getItem("sbonssy_product_name");
  const productPrice =
    urlParams.get("productPrice") ||
    localStorage.getItem("sbonssy_product_price");

  // Get VAT snapshots with persistent fallbacks
  const brandVatCountry = getAttr(
    ["brandVatCountry"],
    "sbonssy_brand_vat_country",
  );
  const brandVatStatus = getAttr(
    ["brandVatStatus"],
    "sbonssy_brand_vat_status",
  );
  const athleteVatCountry = getAttr(
    ["athleteVatCountry"],
    "sbonssy_athlete_vat_country",
  );
  const athleteVatStatus = getAttr(
    ["athleteVatStatus"],
    "sbonssy_athlete_vat_status",
  );

  // Get or generate visitorId
  let visitorId = getAttr(
    ["visitorId", "sbonssy_visitor_id"],
    "sbonssy_visitor_id",
  );
  if (!visitorId) {
    // Generate new visitorId if none exists
    visitorId = `VIS_${Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")}`;
    localStorage.setItem("sbonssy_visitor_id", visitorId);
  }

  if (campaign && athlete && visitorId) {
    // Map compType to the correct event, unless explicitly provided via ?event=
    const eventMap = {
      "pay-per-sale": "purchase",
      "pay-per-lead": "lead",
      "pay-per-click": "click",
      "flat-fee": "participation",
    };
    const mappedEvent =
      compType && eventMap[compType] ? eventMap[compType] : null;

    // Replace with actual order/lead details
    const orderDetails = {
      // For purchase/lead we can use a default if none provided; for refund never default
      amount: amountParam > 0 ? parseFloat(amountParam) : 100,
      currency: "EUR",
      event: urlParams.get("event") || mappedEvent || "purchase", // Default or mapped
    };
    // Determine transactionId rules depending on event type
    if (orderDetails.event === "refund") {
      // Require original purchase transactionId
      if (!txnIdParam) {
        console.error(
          "Refund requires original transactionId in URL (?transactionId=...)\nRefund not sent.",
        );
        return;
      }
      orderDetails.transactionId = txnIdParam;
    } else {
      orderDetails.transactionId = txnIdParam || `ORDER_${Date.now()}`; // default only for non-refund
    }

    const payload = {
      event: orderDetails.event,
      campaign,
      athlete,
      visitorId,
      currency: orderDetails.currency,
      transactionId: orderDetails.transactionId,
      // Product-level attribution (optional)
      productId: productId || undefined,
      productHandle: productHandle || undefined,
      productName: productName || undefined,
      // Snapshots
      brandVatCountry,
      brandVatStatus,
      athleteVatCountry,
      athleteVatStatus,
    };
    if (orderDetails.event === "purchase" && orderDetails.amount) {
      payload.amount = orderDetails.amount;
    } else if (orderDetails.event === "refund") {
      // For refund, include amount ONLY if explicitly provided; otherwise let backend infer
      if (amount && !isNaN(parseFloat(amount))) {
        payload.amount = parseFloat(amount);
      }
    }
    if (productPrice) {
      payload.productPrice = productPrice;
    }

    fetch(`${BASE_URL}/api/postback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((response) => {
        if (!response.ok) {
          console.error("Postback failed:", response.statusText);
        } else {
          console.log(
            "Postback successful:",
            payload.event,
            payload.transactionId,
          );
        }
      })
      .catch((error) => {
        console.error("Postback error:", error.message);
      });
  } else {
    console.warn("Sbonssy tracking: Missing required parameters", {
      campaign:
        campaign ||
        "missing (checked: campaign, utm_campaign, sbonssy_campaign)",
      athlete:
        athlete || "missing (checked: athlete, utm_content, ambassador, ref)",
      visitorId: visitorId || "missing",
    });
    console.info(
      "Sbonssy: Postback not sent. This is expected if customer did not arrive via an affiliate link.",
    );
  }
})();
