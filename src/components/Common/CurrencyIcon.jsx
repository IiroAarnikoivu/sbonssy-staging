// components/Common/CurrencyIcon.jsx
import React from "react";

/**
 * Currency Icon Component
 * Displays currency symbols/icons based on currency code
 * 
 * @param {string} currencyCode - The currency code (USD, EUR, GBP, etc.)
 * @param {string} className - Additional CSS classes
 * @returns {JSX.Element} Currency icon/symbol
 */
export default function CurrencyIcon({ currencyCode, className = "" }) {
  const getCurrencySymbol = (code) => {
    const symbols = {
      USD: "$",
      EUR: "€", 
      GBP: "£",
      JPY: "¥",
      CNY: "¥",
      KRW: "₩",
      INR: "₹",
      CAD: "C$",
      AUD: "A$",
      CHF: "CHF",
      SEK: "kr",
      NOK: "kr",
      DKK: "kr",
      PLN: "zł",
      CZK: "Kč",
      HUF: "Ft",
      RUB: "₽",
      BRL: "R$",
      MXN: "$",
      ZAR: "R",
      SGD: "S$",
      HKD: "HK$",
      NZD: "NZ$",
      THB: "฿",
      MYR: "RM",
      PHP: "₱",
      IDR: "Rp",
      VND: "₫",
      TRY: "₺",
      ILS: "₪",
      AED: "د.إ",
      SAR: "ر.س",
      EGP: "ج.م",
      QAR: "ر.ق",
      KWD: "د.ك",
      BHD: "د.ب",
      OMR: "ر.ع",
      JOD: "د.أ",
      LBP: "ل.ل",
      // Add more currencies as needed
    };
    
    return symbols[code] || code;
  };

  return (
    <span className={`font-medium ${className}`}>
      {getCurrencySymbol(currencyCode)}
    </span>
  );
}
