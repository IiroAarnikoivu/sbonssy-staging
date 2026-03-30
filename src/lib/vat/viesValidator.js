/**
 * VIES VAT Number Validation Service
 * Validates EU VAT numbers using the European Commission's VIES system
 */

function createTranslator(t) {
  const EN = {
    "VAT.vies.tooShort": "VAT number too short",
    "VAT.vies.nonEu": "Not an EU country or VIES not supported",
    "VAT.vies.invalidFormat": "Invalid VAT number format",
    "VAT.vies.notFound": "VAT number not found in VIES database",
    "VAT.vies.fallbackWarning":
      "VIES service unavailable - format validation used",
    "VAT.vies.validationUnavailable":
      "Validation service unavailable: {message}",
    "VAT.vies.formatNote":
      "Format validation passed - VIES verification recommended",
    "VAT.rules.finnishVatNote":
      "Finnish VAT registered - 25.5% VAT added to commission",
    "VAT.rules.euReverseChargeNote":
      "EU reverse charge - no VAT added to payout",
    "VAT.rules.noVatNote": "No VAT registration or invalid VAT - no VAT added",
    "VAT.invoice.domesticNote": "Finnish domestic supply - 25.5% VAT applied",
    "VAT.invoice.reverseChargeNote1":
      "VAT 0%, reverse charge (Article 196 of Council Directive 2006/112/EC)",
    "VAT.invoice.reverseChargeNote2":
      "Customer liable for VAT in their country",
    "VAT.invoice.euNoVatNote":
      "EU customer without valid VAT number - Finnish VAT applied",
    "VAT.invoice.exportNote": "VAT 0%, export of services outside the EU",
  };

  function interpolate(str, vars) {
    if (!vars) return str;
    return Object.keys(vars).reduce(
      (s, k) => s.replace(new RegExp(`\\{${k}\\}`, "g"), String(vars[k])),
      str,
    );
  }

  return (key, fallback, vars) => {
    const base = typeof t === "function" ? t(key, vars) : undefined;
    const msg = base || EN[key] || fallback || key;
    // When t doesn't support variable interpolation, handle it here
    return interpolate(msg, vars);
  };
}

// Official VIES SOAP endpoint (per technical info)
const VIES_SOAP_ENDPOINT =
  "https://ec.europa.eu/taxation_customs/vies/services/checkVatService";

// Alternative REST endpoint to try if SOAP fails
const VIES_ENDPOINTS = [
  "https://ec.europa.eu/taxation_customs/vies/rest-api/ms",
];

async function validateViaSoap(countryCode, vatNumberOnly, tr) {
  const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
    <SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
      <SOAP-ENV:Body>
        <ns1:checkVat>
          <ns1:countryCode>${countryCode}</ns1:countryCode>
          <ns1:vatNumber>${vatNumberOnly}</ns1:vatNumber>
        </ns1:checkVat>
      </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(VIES_SOAP_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        Accept: "text/xml",
        SOAPAction:
          "urn:ec.europa.eu:taxud:vies:services:checkVat:types#checkVat",
      },
      body: soapBody,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`SOAP status ${response.status}`);
    }

    const xml = await response.text();
    const getTag = (tag) => {
      const match = xml.match(
        new RegExp(`<(?:\\w+:)?${tag}>([^<]*)</(?:\\w+:)?${tag}>`, "i"),
      );
      return match ? match[1] : "";
    };

    const validText = getTag("valid").toLowerCase();
    const isValid = validText === "true";

    return {
      isValid,
      country: countryCode,
      vatNumber: `${countryCode}${vatNumberOnly}`,
      name: getTag("name") || undefined,
      address: getTag("address") || undefined,
      validatedBy: "vies_soap",
      error: isValid
        ? undefined
        : tr("VAT.vies.notFound", "VAT number not found in VIES database"),
      errorKey: isValid ? undefined : "VAT.vies.notFound",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

// EU country codes that support VIES validation
const EU_COUNTRIES = [
  "AT",
  "BE",
  "BG",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "EL",
  "ES",
  "FI",
  "FR",
  "HR",
  "HU",
  "IE",
  "IT",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SE",
  "SI",
  "SK",
];

/**
 * Basic VAT number format validation (fallback when VIES is unavailable)
 * @param {string} vatNumber - Full VAT number (e.g., "FI12345678")
 * @returns {object} Basic validation result
 */
function validateVATFormat(vatNumber) {
  const cleanVatNumber = vatNumber.replace(/\s+/g, "").toUpperCase();
  const countryCode = cleanVatNumber.substring(0, 2);
  const vatNumberOnly = cleanVatNumber.substring(2);

  // Basic format validation rules for common EU countries
  const formatRules = {
    FI: /^\d{8}$/, // Finland: 8 digits
    DE: /^\d{9}$/, // Germany: 9 digits
    FR: /^[A-Z]{2}\d{9}$|^\d{11}$/, // France: 2 letters + 9 digits OR 11 digits
    GB: /^\d{9}$|^\d{12}$|^GD\d{3}$|^HA\d{3}$/, // UK: various formats
    IT: /^\d{11}$/, // Italy: 11 digits
    ES: /^[A-Z]\d{7}[A-Z]$|^\d{8}[A-Z]$|^[A-Z]\d{8}$/, // Spain: various formats
    NL: /^\d{9}B\d{2}$/, // Netherlands: 9 digits + B + 2 digits
    BE: /^0\d{9}$/, // Belgium: 0 + 9 digits
    AT: /^U\d{8}$/, // Austria: U + 8 digits
    SE: /^\d{12}$/, // Sweden: 12 digits
    DK: /^\d{8}$/, // Denmark: 8 digits
    PL: /^\d{10}$/, // Poland: 10 digits
    CZ: /^\d{8}$|^\d{9}$|^\d{10}$/, // Czech Republic: 8-10 digits
  };

  const rule = formatRules[countryCode];
  if (rule && rule.test(vatNumberOnly)) {
    return {
      isValid: true,
      country: countryCode,
      vatNumber: cleanVatNumber,
      validatedBy: "format_check",
      note: "VAT.vies.formatNote",
      noteKey: "VAT.vies.formatNote",
    };
  }

  return {
    isValid: false,
    country: countryCode,
    vatNumber: cleanVatNumber,
    error: "VAT.vies.invalidFormat",
    errorKey: "VAT.vies.invalidFormat",
  };
}

/**
 * Validate a VAT number using VIES with fallback to format validation
 * @param {string} vatNumber - Full VAT number (e.g., "FI12345678")
 * @returns {Promise<{isValid: boolean, country: string, vatNumber: string, name?: string, address?: string, error?: string}>}
 */
async function validateVATNumber(vatNumber, t) {
  try {
    const tr = createTranslator(t);
    // Clean and validate input
    const cleanVatNumber = vatNumber.replace(/\s+/g, "").toUpperCase();

    if (!cleanVatNumber || cleanVatNumber.length < 4) {
      return {
        isValid: false,
        country: "",
        vatNumber: cleanVatNumber,
        error: tr("VAT.vies.tooShort", "VAT number too short"),
      };
    }

    // Extract country code and number
    const countryCode = cleanVatNumber.substring(0, 2);
    const vatNumberOnly = cleanVatNumber.substring(2);

    // Check if it's an EU country
    if (!EU_COUNTRIES.includes(countryCode)) {
      return {
        isValid: false,
        country: countryCode,
        vatNumber: cleanVatNumber,
        error: tr("VAT.vies.nonEu", "Not an EU country or VIES not supported"),
      };
    }

    // Try SOAP VIES validation first (per technical info)
    try {
      const soapResult = await validateViaSoap(countryCode, vatNumberOnly, tr);
      if (soapResult?.isValid) {
        return soapResult;
      }
      // If SOAP responded but marked invalid, try REST before giving up
    } catch (soapError) {
      // SOAP failed; fall back to REST
    }

    // Try REST VIES validation next
    try {
      const viesUrl = `${VIES_ENDPOINTS[0]}/${countryCode}/${vatNumberOnly}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(viesUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const raw = await response.text();

      if (response.ok) {
        const data = raw ? JSON.parse(raw) : {};
        return {
          isValid: data.valid === true,
          country: countryCode,
          vatNumber: cleanVatNumber,
          name: data.name || undefined,
          address: data.address || undefined,
          validatedBy: "vies_rest",
          error: data.valid
            ? undefined
            : tr("VAT.vies.notFound", "VAT number not found in VIES database"),
          errorKey: data.valid ? undefined : "VAT.vies.notFound",
        };
      } else if (response.status === 400) {
        return {
          isValid: false,
          country: countryCode,
          vatNumber: cleanVatNumber,
          error: tr("VAT.vies.invalidFormat", "Invalid VAT number format"),
          errorKey: "VAT.vies.invalidFormat",
        };
      }
    } catch (viesError) {
      console.warn(
        "VIES REST validation failed, falling back to format validation:",
        viesError.message,
      );
    }

    // Fallback to format validation
    const formatResult = validateVATFormat(cleanVatNumber);
    return {
      ...formatResult,
      // If validateVATFormat returned message keys, translate them here
      note: formatResult.note && tr(formatResult.note, formatResult.note),
      noteKey: formatResult.noteKey || formatResult.note,
      error: formatResult.error && tr(formatResult.error, formatResult.error),
      errorKey: formatResult.errorKey || formatResult.error,
      warning: tr(
        "VAT.vies.fallbackWarning",
        "VIES service unavailable - format validation used",
      ),
      warningKey: "VAT.vies.fallbackWarning",
    };
  } catch (error) {
    console.error("VAT validation error:", error);

    // Last resort: try format validation
    try {
      const formatResult = validateVATFormat(vatNumber);
      return {
        ...formatResult,
        note: formatResult.note && tr(formatResult.note, formatResult.note),
        noteKey: formatResult.noteKey || formatResult.note,
        error: formatResult.error && tr(formatResult.error, formatResult.error),
        errorKey: formatResult.errorKey || formatResult.error,
        warning: tr(
          "VAT.vies.fallbackWarning",
          "VIES service unavailable - format validation used",
        ),
        warningKey: "VAT.vies.fallbackWarning",
      };
    } catch (formatError) {
      return {
        isValid: false,
        country: vatNumber.substring(0, 2).toUpperCase(),
        vatNumber: vatNumber.replace(/\s+/g, "").toUpperCase(),
        error: tr(
          "VAT.vies.validationUnavailable",
          "Validation service unavailable: {message}",
          { message: error.message },
        ),
      };
    }
  }
}

/**
 * Determine VAT rules for ambassador payouts
 * @param {string} vatCountry - ISO-2 country code
 * @param {string} vatStatus - 'verified', 'valid', 'invalid', or 'not_provided'
 * @returns {object} VAT rules
 */
function getAmbassadorVATRules(vatCountry, vatStatus, t) {
  const tr = createTranslator(t);
  const FINNISH_VAT_RATE = 0.255;

  // Finnish VAT registered -> add 25.5% VAT
  if (
    vatCountry === "FI" &&
    (vatStatus === "valid" || vatStatus === "verified")
  ) {
    return {
      needsVatOnCommission: true,
      vatRate: FINNISH_VAT_RATE,
      treatment: "finnish_vat",
      note: tr(
        "VAT.rules.finnishVatNote",
        "Finnish VAT registered - 25.5% VAT added to commission",
      ),
    };
  }

  // EU (non-FI) with valid VAT -> reverse charge (no VAT on payout)
  if (
    EU_COUNTRIES.includes(vatCountry) &&
    vatCountry !== "FI" &&
    (vatStatus === "valid" || vatStatus === "verified")
  ) {
    return {
      needsVatOnCommission: false,
      vatRate: 0,
      treatment: "eu_reverse_charge",
      note: tr(
        "VAT.rules.euReverseChargeNote",
        "EU reverse charge - no VAT added to payout",
      ),
    };
  }

  // No VAT or invalid VAT -> no VAT on payout
  return {
    needsVatOnCommission: false,
    vatRate: 0,
    treatment: "no_vat",
    note: tr(
      "VAT.rules.noVatNote",
      "No VAT registration or invalid VAT - no VAT added",
    ),
  };
}

/**
 * Determine VAT treatment for brand invoices
 * @param {string} clientCountry - Client's country (ISO-2)
 * @param {string} vatStatus - Client's VAT status ('verified', 'valid', 'invalid', 'not_provided')
 * @param {string} supplierCountry - Supplier country (default 'FI' for Finland)
 * @returns {object} VAT treatment rules
 */
function getBrandInvoiceVATTreatment(
  clientCountry,
  vatStatus,
  supplierCountry = "FI",
  t,
) {
  const tr = createTranslator(t);
  const FINNISH_VAT_RATE = 0.255;

  // Domestic (Finland) -> charge 25.5% VAT
  if (clientCountry === "FI") {
    return {
      vatTreatment: "domestic",
      vatRate: FINNISH_VAT_RATE,
      chargeVat: true,
      notes: [
        tr(
          "VAT.invoice.domesticNote",
          "Finnish domestic supply - 25.5% VAT applied",
        ),
      ],
    };
  }

  // EU with verified VAT -> reverse charge (0% VAT)
  if (EU_COUNTRIES.includes(clientCountry) && vatStatus === "verified") {
    return {
      vatTreatment: "reverse_charge",
      vatRate: 0,
      chargeVat: false,
      notes: [
        tr(
          "VAT.invoice.reverseChargeNote1",
          "Reverse charge – Article 44 & 196 of the EU VAT Directive",
        ),
      ],
    };
  }

  // EU without verified VAT (missing/invalid/format-only) -> charge Finnish VAT
  if (EU_COUNTRIES.includes(clientCountry) && vatStatus !== "verified") {
    return {
      vatTreatment: "domestic",
      vatRate: FINNISH_VAT_RATE,
      chargeVat: true,
      notes: [
        tr(
          "VAT.invoice.euNoVatNote",
          "EU customer without verified VAT ID. Finnish VAT applied",
        ),
      ],
    };
  }

  // Outside EU -> export (0% VAT)
  return {
    vatTreatment: "export",
    vatRate: 0,
    chargeVat: false,
    notes: [
      tr(
        "VAT.invoice.exportNote",
        "VAT 0% – Supply of services outside of the EU",
      ),
    ],
  };
}

/**
 * Calculate VAT amounts
 * @param {number} baseAmount - Base amount before VAT
 * @param {number} vatRate - VAT rate (e.g., 0.255 for 25.5%)
 * @returns {object} Calculated amounts
 */
function calculateVATAmounts(baseAmount, vatRate) {
  const vatAmount = Math.round(baseAmount * vatRate * 100) / 100; // Round to 2 decimal places
  const totalAmount = Math.round((baseAmount + vatAmount) * 100) / 100;

  return {
    baseAmount: Math.round(baseAmount * 100) / 100,
    vatAmount,
    totalAmount,
    vatRate,
  };
}

/**
 * Check if a country is in the EU
 * @param {string} countryCode - ISO-2 country code
 * @returns {boolean}
 */
function isEUCountry(countryCode) {
  const code = countryCode?.toUpperCase();
  // Handle Greece which can be 'GR' or 'EL'
  if (code === "GR" || code === "EL") {
    return true;
  }
  return EU_COUNTRIES.includes(code);
}

module.exports = {
  validateVATNumber,
  getAmbassadorVATRules,
  getBrandInvoiceVATTreatment,
  calculateVATAmounts,
  isEUCountry,
  EU_COUNTRIES,
};
