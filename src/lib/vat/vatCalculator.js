/**
 * VAT Calculation Utilities
 * Centralized VAT calculation logic for both ambassador payouts and brand invoices
 */

import {
  getAmbassadorVATRules,
  getBrandInvoiceVATTreatment,
  calculateVATAmounts,
} from "./viesValidator.js";

// Constants
export const FINNISH_VAT_RATE = 0.255;
export const VAT_ENABLED = process.env.VAT_ENABLED === "true" || false;

/**
 * Calculate ambassador payout with VAT
 * @param {number} commissionAmount - Base commission amount
 * @param {object} ambassador - Ambassador user object
 * @returns {object} Payout calculation
 */
export function calculateAmbassadorPayout(commissionAmount, ambassador) {
  // Get ambassador's VAT information using new nested schema with backward compatibility
  const vd = ambassador?.vatDetails || {};
  const vatCountryRaw =
    vd.vatCountry ||
    vd.registrationCountry ||
    ambassador.vatCountry ||
    ambassador.registrationCountry ||
    "";
  const vatStatusRaw = vd.vatStatus || ambassador.vatStatus || "not_provided";
  // Normalize casing to match rule checks
  const vatCountry =
    typeof vatCountryRaw === "string"
      ? vatCountryRaw.toUpperCase()
      : vatCountryRaw;
  const vatStatus =
    typeof vatStatusRaw === "string"
      ? vatStatusRaw.toLowerCase()
      : vatStatusRaw;
  const vatNumber = vd.vatNumber || ambassador.vatNumber;

  // Determine VAT rules
  const vatRules = getAmbassadorVATRules(vatCountry, vatStatus);

  // Calculate amounts
  const vatAmount = vatRules.needsVatOnCommission
    ? Math.round(commissionAmount * vatRules.vatRate * 100) / 100
    : 0;

  const grossAmount = Math.round((commissionAmount + vatAmount) * 100) / 100;

  return {
    commissionAmount: Math.round(commissionAmount * 100) / 100,
    vatAmount,
    grossAmount,
    vatApplied: vatRules.needsVatOnCommission,
    vatRate: vatRules.vatRate,
    vatNumber: vatRules.needsVatOnCommission ? vatNumber : null,
    vatCountry: vatRules.needsVatOnCommission ? vatCountry : null,
    treatment: vatRules.treatment,
    note: vatRules.note,
  };
}

/**
 * Calculate brand invoice with VAT
 * @param {number} subtotal - Subtotal amount before VAT
 * @param {object} brand - Brand user object
 * @returns {object} Invoice calculation
 */
export function calculateBrandInvoice(subtotal, brand) {
  // Get brand's VAT information
  const vd = brand?.vatDetails || {};
  const rawCountry =
    vd.vatCountry ||
    vd.registrationCountry ||
    brand.country ||
    brand.vatCountry ||
    brand.registrationCountry ||
    "";
  const clientCountry = rawCountry ? String(rawCountry).toUpperCase() : "";
  const vatStatus = (vd.vatStatus || brand.vatStatus || "not_provided")
    .toString()
    .toLowerCase();
  const clientVatNumber = vd.vatNumber || brand.vatNumber;

  // Determine VAT treatment
  const vatTreatment = getBrandInvoiceVATTreatment(clientCountry, vatStatus);

  // Calculate amounts
  const vatAmount = vatTreatment.chargeVat
    ? Math.round(subtotal * vatTreatment.vatRate * 100) / 100
    : 0;

  const total = Math.round((subtotal + vatAmount) * 100) / 100;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    vatAmount,
    total,
    vatRate: vatTreatment.vatRate,
    vatTreatment: vatTreatment.vatTreatment,
    clientVatNumber:
      vatTreatment.vatTreatment === "reverse_charge" ? clientVatNumber : null,
    notes: vatTreatment.notes,
  };
}

/**
 * Generate Stripe transfer metadata for VAT-aware payouts
 * @param {object} payoutData - Payout calculation data
 * @param {string} period - Billing period
 * @param {string} campaignId - Campaign ID
 * @returns {object} Stripe metadata
 */
export function generateTransferMetadata(payoutData, period, campaignId) {
  return {
    commission: payoutData.commissionAmount.toString(),
    vatAmount: payoutData.vatAmount.toString(),
    vatRate: payoutData.vatRate.toString(),
    vatApplied: payoutData.vatApplied.toString(),
    vatNumber: payoutData.vatNumber || "",
    vatCountry: payoutData.vatCountry || "",
    period: period || "",
    campaignId: campaignId || "",
    treatment: payoutData.treatment || "no_vat",
    grossAmount: payoutData.grossAmount.toString(),
  };
}

/**
 * Generate invoice line items with VAT
 * @param {object} invoiceData - Invoice calculation data
 * @param {string} description - Base description
 * @returns {array} Line items array
 */
export function generateInvoiceLineItems(invoiceData, description) {
  const lineItems = [
    {
      description: description,
      amount: invoiceData.subtotal,
      metadata: {
        type: "service",
        vatTreatment: invoiceData.vatTreatment,
      },
    },
  ];

  // Add VAT line item if applicable
  if (invoiceData.vatAmount > 0) {
    lineItems.push({
      description: `VAT ${(invoiceData.vatRate * 100).toFixed(1)}%`,
      amount: invoiceData.vatAmount,
      metadata: {
        type: "vat",
        vatRate: invoiceData.vatRate.toString(),
      },
    });
  }

  return lineItems;
}

/**
 * Calculate Stripe processing fee in cents based on tiered schedule.
 * Fee is computed on the invoice subtotal BEFORE adding the fee itself.
 * Tiers (EUR):
 *  - 0–1,000: 2.0% + €0.30
 *  - 1,000–3,000: 1.9% + €0.25
 *  - 3,000–5,000: 1.7% + €0.25
 *  - >5,000: no extra Stripe charges (0)
 *
 * @param {number} subtotalCents - Subtotal in cents
 * @returns {number} feeCents - Calculated fee in cents (integer)
 */
export function calculateStripeProcessingFeeCents(subtotalCents) {
  if (!Number.isFinite(subtotalCents) || subtotalCents <= 0) return 0;
  const amountEur = subtotalCents / 100;

  // Determine tier by subtotal amount in EUR (inclusive upper bounds per spec)
  let percent = 0;
  let flatCents = 0;

  if (amountEur <= 1000) {
    percent = 0.02; // 2.0%
    flatCents = 30; // €0.30
  } else if (amountEur <= 3000) {
    percent = 0.019; // 1.9%
    flatCents = 25; // €0.25
  } else if (amountEur <= 5000) {
    percent = 0.017; // 1.7%
    flatCents = 25; // €0.25
  } else {
    // > €5,000: no extra Stripe charges
    return 0;
  }

  const percentFee = Math.round(subtotalCents * percent);
  const feeCents = percentFee + flatCents;
  return feeCents > 0 ? feeCents : 0;
}

/**
 * Validate VAT number format according to EU standards
 * @param {string} vatNumber - VAT number to validate (with or without country code)
 * @param {string} countryCode - Expected country code (e.g., 'FI', 'DE')
 * @returns {object} Validation result
 */
export function validateVATNumberFormat(vatNumber, countryCode) {
  if (!vatNumber) {
    return {
      isValid: false,
      error: "VAT number is required",
    };
  }

  if (!countryCode) {
    return {
      isValid: false,
      error: "Country code is required",
    };
  }

  const cleanVatNumber = vatNumber.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const normalizedCountryCode = countryCode.toUpperCase();

  // If VAT number doesn't have country code, add it
  const fullVatNumber = cleanVatNumber.startsWith(normalizedCountryCode)
    ? cleanVatNumber
    : `${normalizedCountryCode}${cleanVatNumber}`;

  const vatNumberOnly = fullVatNumber.substring(2);

  // EU VAT number validation rules by country
  const vatFormats = {
    AT: /^ATU\d{8}$/, // Austria: AT + U + 8 digits
    BE: /^BE[0-1]\d{9}$/, // Belgium: BE + 0 or 1 + 9 digits
    BG: /^BG\d{9,10}$/, // Bulgaria: BG + 9 or 10 digits
    CY: /^CY\d{8}[A-Z]$/, // Cyprus: CY + 8 digits + 1 letter
    CZ: /^CZ\d{8,10}$/, // Czech Republic: CZ + 8-10 digits
    DE: /^DE\d{9}$/, // Germany: DE + 9 digits
    DK: /^DK\d{8}$/, // Denmark: DK + 8 digits
    EE: /^EE\d{9}$/, // Estonia: EE + 9 digits
    EL: /^EL\d{9}$/, // Greece: EL + 9 digits
    ES: /^ES[A-Z0-9]\d{7}[A-Z0-9]$/, // Spain: ES + 1 letter/digit + 7 digits + 1 letter/digit
    FI: /^FI\d{8}$/, // Finland: FI + 8 digits
    FR: /^FR[A-Z0-9]{2}\d{9}$/, // France: FR + 2 letters/numbers + 9 digits
    HR: /^HR\d{11}$/, // Croatia: HR + 11 digits
    HU: /^HU\d{8}$/, // Hungary: HU + 8 digits
    IE: /^IE\d[A-Z0-9\*\+]{7}[A-Z]{1,2}$/, // Ireland: IE + 8-9 characters (complex format)
    IT: /^IT\d{11}$/, // Italy: IT + 11 digits
    LT: /^LT(\d{9}|\d{12})$/, // Lithuania: LT + 9 or 12 digits
    LU: /^LU\d{8}$/, // Luxembourg: LU + 8 digits
    LV: /^LV\d{11}$/, // Latvia: LV + 11 digits
    MT: /^MT\d{8}$/, // Malta: MT + 8 digits
    NL: /^NL\d{9}B\d{2}$/, // Netherlands: NL + 9 digits + B + 2 digits
    PL: /^PL\d{10}$/, // Poland: PL + 10 digits
    PT: /^PT\d{9}$/, // Portugal: PT + 9 digits
    RO: /^RO\d{2,10}$/, // Romania: RO + 2-10 digits
    SE: /^SE\d{12}$/, // Sweden: SE + 12 digits
    SI: /^SI\d{8}$/, // Slovenia: SI + 8 digits
    SK: /^SK\d{10}$/, // Slovakia: SK + 10 digits
  };

  // Check if country is in our validation list
  if (!vatFormats[normalizedCountryCode]) {
    return {
      isValid: false,
      error: `VAT validation not supported for country: ${normalizedCountryCode}`,
      cleanVatNumber: fullVatNumber,
    };
  }

  // Check if the VAT number matches the expected format
  if (!vatFormats[normalizedCountryCode].test(fullVatNumber)) {
    return {
      isValid: false,
      error: `Invalid VAT number format for ${normalizedCountryCode}. Example: ${getExampleVAT(
        normalizedCountryCode,
      )}`,
      cleanVatNumber: fullVatNumber,
    };
  }

  // Additional country-specific validation
  if (normalizedCountryCode === "IT" && !validateItalianVAT(vatNumberOnly)) {
    return {
      isValid: false,
      error: "Invalid Italian VAT number (checksum failed)",
      cleanVatNumber: fullVatNumber,
    };
  }

  // Add more country-specific validations as needed

  return {
    isValid: true,
    cleanVatNumber: fullVatNumber,
    countryCode: normalizedCountryCode,
    vatNumber: vatNumberOnly,
  };
}

/**
 * Get example VAT number for a country
 * @param {string} countryCode - ISO-2 country code
 * @returns {string} Example VAT number
 */
function getExampleVAT(countryCode) {
  const examples = {
    AT: "ATU12345678",
    BE: "BE0123456749",
    BG: "BG123456789",
    CY: "CY12345678A",
    CZ: "CZ12345678",
    DE: "DE123456789",
    DK: "DK12345678",
    EE: "EE123456789",
    EL: "EL123456789",
    ES: "ESA1234567Z",
    FI: "FI12345678",
    FR: "FR12345678901",
    HR: "HR12345678901",
    HU: "HU12345678",
    IE: "IE1234567A",
    IT: "IT12345678901",
    LT: "LT123456789",
    LU: "LU12345678",
    LV: "LV12345678901",
    MT: "MT12345678",
    NL: "NL123456789B12",
    PL: "PL1234567890",
    PT: "PT123456789",
    RO: "RO12345678",
    SE: "SE123456789012",
    SI: "SI12345678",
    SK: "SK1234567890",
  };

  return examples[countryCode] || `${countryCode}XXXXXXXXX`;
}

/**
 * Validate Italian VAT number (includes checksum validation)
 * @param {string} vat - VAT number without country code
 * @returns {boolean} True if valid
 */
function validateItalianVAT(vat) {
  if (vat.length !== 11) return false;

  // Italian VAT validation algorithm
  let sum = 0;
  for (let i = 0; i < 10; i += 2) {
    sum += parseInt(vat.charAt(i));
  }

  for (let i = 1; i < 10; i += 2) {
    const doubled = parseInt(vat.charAt(i)) * 2;
    sum += doubled > 9 ? doubled - 9 : doubled;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(vat.charAt(10));
}

/**
 * Get VAT status display text
 * @param {string} vatStatus - VAT status
 * @param {string} locale - Locale for translations
 * @returns {string} Display text
 */
export function getVATStatusText(vatStatus, locale = "en") {
  const texts = {
    en: {
      valid: "Valid",
      invalid: "Invalid",
      not_provided: "Not provided",
      pending: "Validation pending",
    },
    fi: {
      valid: "Voimassa",
      invalid: "Virheellinen",
      not_provided: "Ei annettu",
      pending: "Tarkistus kesken",
    },
  };

  return texts[locale]?.[vatStatus] || texts.en[vatStatus] || vatStatus;
}

/**
 * Check if VAT validation is required
 * @param {string} countryCode - Country code
 * @param {string} businessType - Business type
 * @returns {boolean}
 */
export function isVATValidationRequired(countryCode, businessType) {
  // VAT validation required for companies in EU countries
  return (
    businessType === "company" &&
    [
      "FI",
      "SE",
      "NO",
      "DK",
      "DE",
      "FR",
      "ES",
      "IT",
      "NL",
      "BE",
      "AT",
      "PL",
    ].includes(countryCode)
  );
}

/**
 * Generate period identifier for payouts
 * @param {Date} date - Reference date
 * @returns {string} Period identifier (YYYY-MM)
 */
export function generatePayoutPeriod(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}`;
}
