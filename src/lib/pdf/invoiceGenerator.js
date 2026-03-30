/**
 * PDF Invoice Generator with VAT Support
 * Generates VAT-compliant PDF invoices for different tax treatments
 */

import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { getBrandInvoiceVATTreatment } from "@/lib/vat/viesValidator";

// Company information
const COMPANY_INFO = {
  name: process.env.COMPANY_NAME || "Sbonssy Oy",
  address:
    process.env.COMPANY_ADDRESS || "Hämeenkatu 1, 33100 Tampere, Finland",
  vatNumber: process.env.COMPANY_VAT_NUMBER || "FI12345678",
  businessId: process.env.COMPANY_BUSINESS_ID || "1234567-8",
  email: process.env.COMPANY_EMAIL || "billing@sbonssy.com",
  phone: process.env.COMPANY_PHONE || "+358 40 123 4567",
  website: process.env.COMPANY_WEBSITE || "www.sbonssy.com",
};

/**
 * Generate PDF invoice with VAT support
 * @param {Object} invoiceData - Invoice data from database
 * @param {Object} brandData - Brand/customer data
 * @returns {Promise<Buffer>} PDF buffer
 */
export async function generateVATInvoicePDF(invoiceData, brandData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      // Enrich invoice with brand VAT snapshot fallbacks so PDF always has notes
      const brandVatDetails = brandData?.brand?.vatDetails || {};
      const brandCountryFallback = (
        invoiceData.brandCountry ||
        brandVatDetails.vatCountry ||
        brandVatDetails.registrationCountry ||
        brandData?.brand?.country ||
        brandData?.country ||
        ""
      )
        .toString()
        .toUpperCase();
      const brandVatStatusFallback = (
        invoiceData.brandVatStatus ||
        brandVatDetails.vatStatus ||
        brandData?.vatStatus ||
        "not_provided"
      )
        .toString()
        .toLowerCase();

      const hydratedInvoice = {
        ...invoiceData,
        brandCountry: brandCountryFallback,
        brandVatStatus: brandVatStatusFallback,
      };

      // If notes missing, recompute from VAT treatment helper
      if (!hydratedInvoice.notes || hydratedInvoice.notes.length === 0) {
        const treatment = getBrandInvoiceVATTreatment(
          brandCountryFallback,
          brandVatStatusFallback,
        );
        hydratedInvoice.notes = treatment?.notes || [];
      }

      // Header
      generateHeader(doc);

      // Invoice details
      generateInvoiceDetails(doc, hydratedInvoice);

      // Customer information
      generateCustomerInfo(doc, brandData, hydratedInvoice);

      // Line items with VAT
      generateLineItems(doc, hydratedInvoice);

      // VAT summary
      generateVATSummary(doc, hydratedInvoice);

      // Payment terms and notes
      generatePaymentTerms(doc, hydratedInvoice);

      // Footer
      generateFooter(doc);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function generateHeader(doc) {
  doc
    .fontSize(20)
    .text(COMPANY_INFO.name, 50, 45)
    .fontSize(10)
    .text(COMPANY_INFO.address, 50, 70)
    .text(`VAT: ${COMPANY_INFO.vatNumber}`, 50, 85)
    .text(`Business ID: ${COMPANY_INFO.businessId}`, 50, 100)
    .text(`Email: ${COMPANY_INFO.email}`, 50, 115)
    .text(`Phone: ${COMPANY_INFO.phone}`, 50, 130);

  // Invoice title
  doc.fontSize(24).text("INVOICE", 400, 45, { align: "right" });

  // Line separator
  doc
    .strokeColor("#aaaaaa")
    .lineWidth(1)
    .moveTo(50, 160)
    .lineTo(550, 160)
    .stroke();
}

function generateInvoiceDetails(doc, invoiceData) {
  const invoiceNumber =
    invoiceData.invoiceNumber ||
    `INV-${invoiceData.stripeInvoiceId?.slice(-8)}`;
  const invoiceDate = new Date(invoiceData.createdAt).toLocaleDateString(
    "en-GB",
  );
  const dueDate = new Date(
    Date.now() + 14 * 24 * 60 * 60 * 1000,
  ).toLocaleDateString("en-GB"); // 14 days from now

  doc
    .fontSize(10)
    .text("Invoice Number:", 400, 180)
    .text(invoiceNumber, 480, 180)
    .text("Invoice Date:", 400, 195)
    .text(invoiceDate, 480, 195)
    .text("Due Date:", 400, 210)
    .text(dueDate, 480, 210)
    .text("Currency:", 400, 225)
    .text((invoiceData.currency || "EUR").toUpperCase(), 480, 225);
}

function generateCustomerInfo(doc, brandData, invoiceData) {
  doc
    .fontSize(12)
    .text("Bill To:", 50, 180)
    .fontSize(10)
    .text(brandData.brand?.name || brandData.name || "Customer", 50, 200)
    .text(brandData.email, 50, 215);

  if (brandData.brand?.address) {
    doc.text(brandData.brand.address, 50, 230);
  }

  // VAT information
  if (invoiceData.clientVatNumber) {
    doc.text(`VAT Number: ${invoiceData.clientVatNumber}`, 50, 245);
  }

  // VAT treatment note
  const vatTreatmentNote = getVATTreatmentNote(invoiceData.vatTreatment);
  if (vatTreatmentNote) {
    doc
      .fontSize(8)
      .fillColor("#666666")
      .text(vatTreatmentNote, 50, 260, { width: 300 })
      .fillColor("#000000");
  }
}

function generateLineItems(doc, invoiceData) {
  let currentY = 320;

  // Table header
  doc
    .fontSize(10)
    .text("Description", 50, currentY)
    .text("Quantity", 300, currentY)
    .text("Unit Price", 370, currentY)
    .text("Amount", 450, currentY, { align: "right" });

  // Header line
  doc
    .strokeColor("#aaaaaa")
    .lineWidth(1)
    .moveTo(50, currentY + 15)
    .lineTo(550, currentY + 15)
    .stroke();

  currentY += 25;

  // Line items
  const lineItems = invoiceData.lineItems || [];

  lineItems.forEach((item) => {
    const amount = (item.amount / 100).toFixed(2);
    const currency = (invoiceData.currency || "EUR").toUpperCase();

    doc
      .fontSize(9)
      .text(item.description, 50, currentY, { width: 240 })
      .text("1", 300, currentY)
      .text(`${amount} ${currency}`, 370, currentY)
      .text(`${amount} ${currency}`, 450, currentY, { align: "right" });

    currentY += 20;
  });

  return currentY;
}

function generateVATSummary(doc, invoiceData) {
  let currentY = 500;
  const currency = (invoiceData.currency || "EUR").toUpperCase();

  // Summary box
  doc.rect(350, currentY - 10, 200, 120).stroke();

  // Subtotal
  const subtotal = ((invoiceData.subtotal || invoiceData.amount) / 100).toFixed(
    2,
  );
  doc
    .fontSize(10)
    .text("Subtotal:", 360, currentY)
    .text(`${subtotal} ${currency}`, 450, currentY, { align: "right" });

  currentY += 20;

  // VAT line
  if (invoiceData.vatAmount && invoiceData.vatAmount > 0) {
    const vatAmount = (invoiceData.vatAmount / 100).toFixed(2);
    const vatRate = ((invoiceData.vatRate || 0.255) * 100).toFixed(1);

    doc
      .text(`VAT ${vatRate}%:`, 360, currentY)
      .text(`${vatAmount} ${currency}`, 450, currentY, { align: "right" });
  } else {
    doc
      .text("VAT 0%:", 360, currentY)
      .text(`0.00 ${currency}`, 450, currentY, { align: "right" });
  }

  currentY += 20;

  // Total line
  doc
    .strokeColor("#000000")
    .lineWidth(1)
    .moveTo(360, currentY)
    .lineTo(540, currentY)
    .stroke();

  currentY += 10;

  const total = ((invoiceData.total || invoiceData.amount) / 100).toFixed(2);
  doc
    .fontSize(12)
    .text("Total:", 360, currentY)
    .text(`${total} ${currency}`, 450, currentY, { align: "right" });
}

function generatePaymentTerms(doc, invoiceData) {
  let currentY = 650;

  doc
    .fontSize(10)
    .text("Payment Terms:", 50, currentY)
    .fontSize(9)
    .text("Payment is due within 14 days of invoice date.", 50, currentY + 15)
    .text("Late payments may incur additional charges.", 50, currentY + 30);

  // VAT notes based on treatment
  const vatNotes = getVATNotes(invoiceData);
  if (vatNotes.length > 0) {
    currentY += 60;
    doc.fontSize(10).text("VAT Notes:", 50, currentY);

    vatNotes.forEach((note, index) => {
      doc
        .fontSize(8)
        .text(`• ${note}`, 50, currentY + 15 + index * 12, { width: 500 });
    });
  }
}

function generateFooter(doc) {
  doc
    .fontSize(8)
    .fillColor("#666666")
    .text(
      `${COMPANY_INFO.name} | ${COMPANY_INFO.website} | ${COMPANY_INFO.email}`,
      50,
      750,
      { align: "center", width: 500 },
    )
    .text(
      `VAT Number: ${COMPANY_INFO.vatNumber} | Business ID: ${COMPANY_INFO.businessId}`,
      50,
      765,
      { align: "center", width: 500 },
    );
}

function getVATTreatmentNote(vatTreatment) {
  switch (vatTreatment) {
    case "reverse_charge":
      return "VAT 0% - Reverse charge applies. Customer liable for VAT in their country.";
    case "export":
      return "VAT 0% - Export of services outside the EU.";
    case "domestic":
      return "Finnish domestic supply - VAT included.";
    default:
      return null;
  }
}

function getVATNotes(invoiceData) {
  const notes = [];

  if (invoiceData.vatTreatment === "reverse_charge") {
    notes.push(
      "Reverse charge mechanism applies according to Article 196 of Council Directive 2006/112/EC",
    );
    notes.push(
      "The customer is liable for VAT in their country of establishment",
    );
  }

  if (invoiceData.vatTreatment === "export") {
    notes.push(
      "Services supplied to customers outside the EU are exempt from Finnish VAT",
    );
  }

  if (invoiceData.vatTreatment === "domestic") {
    const rate = invoiceData.vatRate
      ? `${(invoiceData.vatRate * 100).toFixed(1)}%`
      : "25.5%";
    notes.push(`Finnish VAT ${rate} applied (domestic supply).`);
  }

  // Footer or metadata notes (e.g., set by cron when creating Stripe invoice)
  if (invoiceData.footer) {
    notes.push(invoiceData.footer);
  }
  if (invoiceData.metadata?.vatNotes) {
    notes.push(invoiceData.metadata.vatNotes);
  }

  if (invoiceData.notes) {
    if (Array.isArray(invoiceData.notes)) {
      notes.push(...invoiceData.notes);
    } else if (typeof invoiceData.notes === "string") {
      notes.push(invoiceData.notes);
    }
  }

  // Fallback: if no explicit notes, recompute treatment notes using saved country/status
  if (notes.length === 0) {
    const country = (
      invoiceData.brandCountry ||
      invoiceData.clientCountry ||
      invoiceData.vatCountry ||
      ""
    )
      .toString()
      .toUpperCase();
    const status = (
      invoiceData.brandVatStatus ||
      invoiceData.vatStatus ||
      "not_provided"
    )
      .toString()
      .toLowerCase();
    if (country) {
      const treatment = getBrandInvoiceVATTreatment(country, status);
      if (treatment?.notes?.length) {
        notes.push(...treatment.notes);
      }
    }
  }

  // Dedupe and remove falsy entries
  return [...new Set(notes.filter(Boolean))];
}

/**
 * Generate simple invoice PDF (legacy support)
 * @param {Object} invoiceData - Invoice data
 * @returns {Promise<Buffer>} PDF buffer
 */
export async function generateInvoicePDF(invoiceData) {
  // For backward compatibility, use VAT-aware generator
  return generateVATInvoicePDF(invoiceData, { email: "customer@example.com" });
}
