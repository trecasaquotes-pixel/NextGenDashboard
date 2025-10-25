import type { Page } from "puppeteer";
import type { Quotation } from "@shared/schema";
import { generateRenderToken } from "./render-token";
import { PDFDocument, rgb } from "pdf-lib";
import { readFileSync } from "fs";
import path from "path";
import { withPage } from "./browserManager";
import { enqueuePdf } from "./taskQueue";
import { logger } from "../utils/logger";

/**
 * Generate PDF with optional universal header/footer templates
 * Uses Puppeteer's native displayHeaderFooter with branded templates
 * @param useHeaderFooter - Whether to use Puppeteer's displayHeaderFooter (default: true)
 *                          Set to false for pages with built-in headers/footers (e.g., Agreement)
 */
// Load logo once and cache it
let cachedLogoBase64: string | null = null;
function getLogoBase64(): string {
  if (cachedLogoBase64 === null) {
    try {
      const logoPath = path.resolve(process.cwd(), "attached_assets", "trecasa-logo.png");
      const logoBuffer = readFileSync(logoPath);
      cachedLogoBase64 = logoBuffer.toString("base64");
    } catch (error) {
      logger.error("Failed to load logo", { traceId: "pdf-assets", error });
      cachedLogoBase64 = "";
    }
  }
  return cachedLogoBase64;
}

// Cache footer text from global rules
let cachedFooterLines: { line1: string; line2: string } | null = null;
let footerCacheTime = 0;
const FOOTER_CACHE_TTL = 60000; // 1 minute cache

async function getFooterLines(): Promise<{ line1: string; line2: string }> {
  const now = Date.now();
  
  if (cachedFooterLines && (now - footerCacheTime) < FOOTER_CACHE_TTL) {
    return cachedFooterLines;
  }

  try {
    const { db } = await import("../db");
    const { globalRules } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    
    const [rules] = await db.select().from(globalRules).where(eq(globalRules.id, "global"));
    
    cachedFooterLines = {
      line1: rules?.footerLine1 || "TRECASA Design Studio | Luxury Interiors | Architecture | Build",
      line2: rules?.footerLine2 || "www.trecasadesignstudio.com | +91-XXXXXXXXXX",
    };
    
    footerCacheTime = now;
    return cachedFooterLines;
  } catch (error) {
    logger.error("Error fetching footer from global rules", { traceId: "pdf-footer", error });
    // Return fallback values
    return {
      line1: "TRECASA Design Studio | Luxury Interiors | Architecture | Build",
      line2: "www.trecasadesignstudio.com | +91-XXXXXXXXXX",
    };
  }
}

export async function emitPdf(
  page: Page,
  titleText: string,
  includePageNumbers: boolean = true,
  useHeaderFooter: boolean = true,
): Promise<Buffer> {
  // Load and embed logo as base64
  const logoBase64 = getLogoBase64();
  
  // Get current date for footer
  const currentYear = new Date().getFullYear();
  const currentDate = new Date().toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });

  // Footer template WITHOUT page numbers (pdf-lib handles continuous numbering across merged docs)
  const footerTemplate = `
    <div style="
      font-family: Montserrat, Arial, sans-serif;
      font-size: 10px;
      color: rgba(0, 0, 0, 0.6);
      width: 100%;
      padding: 6px 18mm 0 18mm;
      border-top: 1px solid #e0e0e0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    ">
      <div>© ${currentYear} Trecasa Design Studio<span style="color:#E50914;margin-left:4px;">•</span></div>
      <div style="opacity:0.85;">www.trecasadesignstudio.com&nbsp;|&nbsp;@trecasa.designstudio</div>
    </div>
  `;

  const pdfBytes = await page.pdf({
    format: "A4",
    printBackground: true,
    displayHeaderFooter: useHeaderFooter,
    margin: useHeaderFooter 
      ? { top: "80px", bottom: "60px", left: "18mm", right: "18mm" }
      : { top: "18mm", bottom: "18mm", left: "18mm", right: "18mm" },
    headerTemplate: useHeaderFooter ? `
      <div style="
        font-family: Montserrat, Arial, sans-serif;
        font-size: 12px;
        color: #1C1C1C;
        width: 100%;
        padding: 6px 18mm 0 18mm;
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <div>Trecasa Design Studio<span style="color:#E50914;margin-left:4px;">•</span></div>
        <div style="opacity:0.75;">${currentDate}</div>
      </div>
    ` : "",
    footerTemplate: useHeaderFooter ? footerTemplate : "",
  });

  // Convert Uint8Array to Buffer
  return Buffer.from(pdfBytes);
}

/**
 * Generate PDF for a specific quotation view
 * @param quotation - The quotation data
 * @param type - Type of PDF to generate ('interiors' | 'false-ceiling' | 'agreement')
 * @param baseUrl - Base URL of the application (e.g. 'http://localhost:5000')
 * @param includePageNumbers - Whether to include page numbers in footer (default: true)
 * @param excludeTerms - Whether to exclude T&C sections (for Agreement Pack annexures, default: false)
 * @returns PDF buffer
 */
export async function generateQuotationPDF(
  quotation: Quotation,
  type: "interiors" | "false-ceiling" | "agreement",
  baseUrl: string,
  includePageNumbers: boolean = true,
  excludeTerms: boolean = false,
): Promise<Buffer> {
  const traceId = `pdf-${quotation.quoteId}-${type}`;

  try {
    return await withPage(async (page) => {
      await page.setViewport({
        width: 1200,
        height: 1600,
        deviceScaleFactor: 2,
      });

      const token = generateRenderToken(quotation.id);

      let url: string;
      if (type === "agreement") {
        url = `${baseUrl}/render/quotation/${quotation.id}/agreement?token=${encodeURIComponent(token)}`;
      } else {
        const section = type === "interiors" ? "interiors" : "false-ceiling";
        const excludeTermsParam = excludeTerms ? "&excludeTerms=true" : "";
        url = `${baseUrl}/render/quotation/${quotation.id}/print?section=${section}&token=${encodeURIComponent(token)}${excludeTermsParam}`;
      }

      logger.info(`[PDF Generator] Navigating to ${url}`, { traceId });
      await page.goto(url, {
        waitUntil: "networkidle0",
        timeout: 30000,
      });

      await page.waitForSelector("[data-pdf-ready]", { timeout: 5000 }).catch(() => {
        logger.warn("[PDF Generator] PDF ready marker not found, proceeding", { traceId });
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));

      let selector: string;
      if (type === "interiors") {
        selector = "#print-interiors-root";
      } else if (type === "false-ceiling") {
        selector = "#print-fc-root";
      } else {
        selector = "#print-agreement-root";
      }

      const elementExists = await page.$(selector);
      if (!elementExists) {
        throw new Error(`Element ${selector} not found on page`);
      }

      await page.addStyleTag({
        content: `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=Montserrat:wght@400;500;600&display=swap');
        
        @page {
          size: A4 portrait;
          margin: 12.7mm;
        }
        
        @media print {
          body {
            font-family: 'Montserrat', Arial, sans-serif;
            font-size: 9pt;
            color: #1A1A1A;
            margin: 0;
            padding: 0;
            line-height: 1.35;
          }
          
          h1, h2, h3, h4 {
            font-family: 'Playfair Display', Georgia, serif;
            line-height: 1.2;
          }
          
          /* Body content - margins handled by Puppeteer displayHeaderFooter */
          .pdf-body {
            padding-top: 0;
            padding-bottom: 0;
          }
          
          /* Page breaks */
          .page-break {
            page-break-after: always;
          }
          
          .page-break-before {
            page-break-before: always;
          }
          
          .break-inside-avoid {
            page-break-inside: avoid;
          }
          
          /* Part 2B: Fix table pagination - allow tables to continue across pages */
          .table, table {
            page-break-inside: auto;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
          }
          
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          thead {
            display: table-header-group; /* Repeat table headers automatically */
          }
          
          tfoot {
            display: table-row-group; /* Allow footer rows to flow */
          }
          
          tbody {
            display: table-row-group;
          }
          
          /* Part 2B: Compact row spacing for more lines per page */
          .table td, .table th, td, th {
            padding: 5px 6px;
            line-height: 1.25;
            font-size: 10.5px;
          }
          
          /* Part 2C: Status dot styling */
          .status-dot {
            width: 6px;
            height: 6px;
            background: #b52626;
            border-radius: 50%;
            display: inline-block;
            margin-left: 8px;
            transform: translateY(1px);
          }
          
          .brand-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          
          /* Enhanced room block page break handling */
          .room-block {
            page-break-inside: avoid;
            margin-top: 16px;
            min-height: 60px;
          }
          
          .room-block:first-child {
            margin-top: 0;
          }
          
          /* Ensure room title stays with at least first 2 rows */
          .room-title + .room-table thead {
            page-break-after: avoid;
          }
          
          .room-table tbody tr:first-child {
            page-break-before: avoid;
          }
          
          .room-table tbody tr:nth-child(2) {
            page-break-before: avoid;
          }
          
          .room-title {
            margin-bottom: 6px;
            font-weight: 600;
            font-family: 'Playfair Display', Georgia, serif;
            font-size: 11pt;
            color: #18492d;
            line-height: 1.3;
          }
          
          .room-table {
            page-break-inside: auto;
            border-collapse: collapse;
            width: 100%;
          }
          
          .room-table thead tr {
            background-color: #F2F2F2;
            height: 26px;
          }
          
          .room-table thead th {
            padding: 6px 8px;
            font-family: 'Montserrat', Arial, sans-serif;
            font-weight: 600;
            font-size: 8pt;
            border-bottom: 1px solid #E0E0E0;
            text-align: left;
          }
          
          .room-table tbody tr {
            min-height: 24px;
            border-bottom: 0.5pt solid #EAEAEA;
          }
          
          .room-table tbody td {
            padding: 6px 8px;
            font-family: 'Montserrat', Arial, sans-serif;
            font-size: 7.5pt;
            color: #1A1A1A;
            line-height: 1.3;
          }
          
          /* Room subtotal styling */
          .room-subtotal {
            background: #18492d;
            color: #FFFFFF;
            font-weight: 500;
          }
          
          .room-subtotal td {
            padding: 6px 10px;
            height: 26px;
            line-height: 1.2;
            font-family: 'Montserrat', Arial, sans-serif;
            font-size: 9.5pt;
          }
          
          /* Part 2A: Summary section styles */
          .summary-section h2 {
            font-family: 'Playfair Display', Georgia, serif;
            font-weight: 700;
            color: #18492d;
            margin: 0 0 6mm;
          }
          
          .summary-table {
            width: 100%;
            border-collapse: collapse;
            font-family: 'Montserrat', Arial, sans-serif;
            font-size: 11px;
          }
          
          .summary-table th, .summary-table td {
            border-bottom: 1px solid #E6E6E6;
            padding: 6px 8px;
          }
          
          .summary-table thead th {
            background: #F3F6F5;
            font-weight: 600;
          }
          
          .summary-grand td {
            border-top: 2px solid #C7A948;
            font-weight: 700;
          }
          
          .spacer-8 {
            height: 8mm;
          }
          
          /* Summary totals styling */
          .summary-totals {
            margin-top: 10mm;
          }
          
          .summary-totals .final-total {
            border-top: 2px solid #C7A948;
            padding-top: 6px;
            font-size: 18px;
            font-weight: 700;
            font-family: 'Playfair Display', Georgia, serif;
            color: #18492d;
          }
          
          /* Section title */
          .section-title {
            font-family: 'Playfair Display', Georgia, serif;
            font-size: 11pt;
            font-weight: 700;
            color: #1A1A1A;
            margin-bottom: 8px;
          }
          
          .header-meta {
            font-family: 'Montserrat', Arial, sans-serif;
          }
          
          /* Terms & Conditions styling */
          .terms-section {
            font-size: 8.5pt;
            line-height: 1.45;
            margin-top: 14px;
          }
          
          .terms-section h2, .terms-section h3 {
            font-family: 'Playfair Display', Georgia, serif;
            font-size: 11pt;
            font-weight: 700;
            color: #18492d;
            margin-bottom: 10px;
            margin-top: 16px;
          }
          
          .terms-section p, .terms-section li {
            margin-bottom: 8px;
            font-family: 'Montserrat', Arial, sans-serif;
          }
          
          .terms-section ul {
            padding-left: 20px;
            margin: 6px 0;
          }
          
          .terms-section li {
            margin-bottom: 6px;
            line-height: 1.4;
          }
          
          /* Materials & Brands enhanced styling */
          .materials-section {
            background-color: #F8F9FA;
            padding: 10px 14px;
            border-left: 3px solid #C7A948;
            margin: 10px 0;
            page-break-inside: avoid;
          }
          
          .materials-section li {
            font-size: 8.5pt;
            margin-bottom: 5px;
          }
          
          /* Cover Page Styling - Force display in PDF */
          .cover-page {
            display: flex !important;
            page-break-after: always;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            min-height: 900px;
            text-align: center;
            padding: 60px 40px;
            background: linear-gradient(135deg, #18492d 0%, #1d5938 100%);
            color: white;
          }
          
          .cover-logo {
            font-family: 'Montserrat', Arial, sans-serif;
            font-size: 32pt;
            font-weight: 700;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            margin-bottom: 8px;
          }
          
          .cover-tagline {
            font-family: 'Playfair Display', Georgia, serif;
            font-size: 14pt;
            font-style: italic;
            color: #C7A948;
            margin-bottom: 60px;
          }
          
          .cover-title {
            font-family: 'Playfair Display', Georgia, serif;
            font-size: 28pt;
            font-weight: 700;
            margin-bottom: 40px;
            line-height: 1.3;
          }
          
          .cover-divider {
            width: 80px;
            height: 3px;
            background-color: #C7A948;
            margin: 30px auto;
          }
          
          .cover-details {
            font-family: 'Montserrat', Arial, sans-serif;
            font-size: 13pt;
            margin-top: 40px;
            line-height: 1.8;
          }
          
          .cover-details strong {
            color: #C7A948;
            font-weight: 600;
          }
          
          .cover-footer {
            position: absolute;
            bottom: 40px;
            left: 0;
            right: 0;
            text-align: center;
            font-family: 'Montserrat', Arial, sans-serif;
            font-size: 9pt;
            color: rgba(255, 255, 255, 0.7);
          }
        }
      `,
    });

      let titleText: string;
      if (type === "interiors") {
        titleText = "Interiors Quotation";
      } else if (type === "false-ceiling") {
        titleText = "False Ceiling Quotation";
      } else {
        titleText = "Service Agreement & Annexures";
      }

      const useHeaderFooter = true;
      logger.info(
        `[PDF Generator] Generating PDF for ${type} with title: ${titleText}, includePageNumbers: ${includePageNumbers}, useHeaderFooter: ${useHeaderFooter}`,
        { traceId },
      );
      const pdfBuffer = await emitPdf(page, titleText, includePageNumbers, useHeaderFooter);
      logger.info(`[PDF Generator] PDF generated successfully`, {
        traceId,
        bytes: pdfBuffer.length,
      });
      return pdfBuffer;
    });
  } catch (error) {
    logger.error(`[PDF Generator] Error generating ${type} PDF`, { traceId, error });
    const reason = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to generate ${type} PDF: ${reason}`);
  }
}

/**
 * Generate all PDFs for a quotation
 * @param quotation - The quotation data
 * @param baseUrl - Base URL of the application
 * @returns Object with PDF buffers
 */
export async function generateAllQuotationPDFs(
  quotation: Quotation,
  baseUrl: string,
): Promise<{
  interiors: Buffer;
  falseCeiling: Buffer;
  agreement: Buffer;
}> {
  const traceId = `pdf-pack-${quotation.quoteId}`;
  const start = Date.now();
  logger.info(`[PDF Generator] Generating all PDFs for quotation ${quotation.quoteId}`, {
    traceId,
    job: "pdf_pack",
    action: "start",
    quoteId: quotation.quoteId,
  });

  try {
    const [interiors, falseCeiling] = await Promise.all([
      enqueuePdf(() => generateQuotationPDF(quotation, "interiors", baseUrl, false, true)),
      enqueuePdf(() => generateQuotationPDF(quotation, "false-ceiling", baseUrl, false, true)),
    ]);
    const agreement = await enqueuePdf(() => generateQuotationPDF(quotation, "agreement", baseUrl, false));

    const [interiorsDoc, falseCeilingDoc, agreementDoc] = await Promise.all([
      PDFDocument.load(interiors),
      PDFDocument.load(falseCeiling),
      PDFDocument.load(agreement),
    ]);

    const interiorsPages = interiorsDoc.getPageCount();
    const falseCeilingPages = falseCeilingDoc.getPageCount();
    const agreementPages = agreementDoc.getPageCount();
    const totalPages = interiorsPages + falseCeilingPages + agreementPages;

    logger.info(`[PDF Generator] Completed PDF generation for ${quotation.quoteId}`, {
      traceId,
      job: "pdf_pack",
      action: "done",
      quoteId: quotation.quoteId,
      ms: Date.now() - start,
      pages: {
        interiors: interiorsPages,
        falseCeiling: falseCeilingPages,
        agreement: agreementPages,
        total: totalPages,
      },
    });

    return {
      interiors,
      falseCeiling,
      agreement,
    };
  } catch (error) {
    logger.error("[PDF Generator] Error generating all PDFs", { traceId, error });
    throw error;
  }
}

/**
 * Add continuous page numbers to a merged PDF
 * @param pdfDoc - PDFDocument instance from pdf-lib
 * @returns Modified PDFDocument with continuous page numbers
 */
export async function addContinuousPageNumbers(pdfDoc: PDFDocument): Promise<PDFDocument> {
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();
    const pageNumber = i + 1;

    // Draw page number in footer area (right side, matching Puppeteer footer style)
    const fontSize = 10;
    const text = `Page ${pageNumber} of ${totalPages}`;
    const textWidth = text.length * (fontSize * 0.5); // Approximate width

    page.drawText(text, {
      x: width - textWidth - 51, // 18mm right margin = ~51pt
      y: 30, // Bottom margin area
      size: fontSize,
      color: rgb(0.27, 0.27, 0.27), // #444 in RGB
    });
  }

  return pdfDoc;
}
