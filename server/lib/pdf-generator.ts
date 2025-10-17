import puppeteer from 'puppeteer';
import type { Quotation } from '@shared/schema';
import { generateRenderToken } from './render-token';

/**
 * Generate PDF for a specific quotation view
 * @param quotation - The quotation data
 * @param type - Type of PDF to generate ('interiors' | 'false-ceiling' | 'agreement')
 * @param baseUrl - Base URL of the application (e.g. 'http://localhost:5000')
 * @returns PDF buffer
 */
export async function generateQuotationPDF(
  quotation: Quotation,
  type: 'interiors' | 'false-ceiling' | 'agreement',
  baseUrl: string
): Promise<Buffer> {
  let browser;
  
  try {
    // Launch browser with minimal options
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();
    
    // Set viewport for consistent rendering
    await page.setViewport({
      width: 1200,
      height: 1600,
      deviceScaleFactor: 2,
    });

    // Generate render token for authentication
    const token = generateRenderToken(quotation.id);
    
    // Navigate to the appropriate render page
    let url: string;
    if (type === 'agreement') {
      url = `${baseUrl}/render/quotation/${quotation.id}/agreement?token=${encodeURIComponent(token)}`;
    } else {
      url = `${baseUrl}/render/quotation/${quotation.id}/print?token=${encodeURIComponent(token)}`;
    }
    
    console.log(`[PDF Generator] Navigating to ${url}`);
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // Wait for content to be fully rendered
    await page.waitForSelector('[data-pdf-ready]', { timeout: 5000 }).catch(() => {
      console.log('[PDF Generator] Warning: PDF ready marker not found, proceeding anyway');
    });

    // Additional wait to ensure everything is loaded
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Select the appropriate element to print based on type
    let selector: string;
    if (type === 'interiors') {
      selector = '#print-interiors-root';
    } else if (type === 'false-ceiling') {
      selector = '#print-fc-root';
    } else {
      selector = '#print-agreement-root';
    }

    // Check if element exists
    const elementExists = await page.$(selector);
    if (!elementExists) {
      throw new Error(`Element ${selector} not found on page`);
    }

    // Inject PDF-optimized CSS with Google Fonts and professional specifications
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
          
          /* Fixed header & footer that repeat across pages */
          .pdf-header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 1000;
            min-height: 110px;
            padding: 16px 24px;
            background: #154734;
            color: white;
            font-family: 'Montserrat', Arial, sans-serif;
            line-height: 1.3;
            border-radius: 8px 8px 0 0;
          }
          
          .pdf-header h1 {
            font-family: 'Montserrat', Arial, sans-serif;
            font-size: 15pt;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 0 0 6px 0;
          }
          
          .pdf-header .address-text {
            font-size: 8.5pt;
            line-height: 1.4;
          }
          
          .pdf-header .client-project {
            font-size: 9pt;
            line-height: 1.4;
          }
          
          .pdf-header .greeting {
            font-family: 'Playfair Display', Georgia, serif;
            font-size: 9.5pt;
            font-style: italic;
            margin-top: 8px;
          }
          
          .pdf-header .contact-details {
            font-size: 8.5pt;
            line-height: 1.4;
          }
          
          .pdf-header .issue-date,
          .pdf-header .quote-id {
            font-size: 9pt;
            font-weight: 500;
          }
          
          .pdf-header .grid {
            display: grid;
            grid-template-columns: 70% 30%;
            gap: 16px;
          }
          
          .pdf-footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Montserrat', Arial, sans-serif;
            font-size: 8pt;
            color: #666666;
            padding: 10px 0;
            border-top: 1px solid #C7A948;
            background: white;
            z-index: 1000;
          }
          
          .pdf-body {
            margin-top: 32mm;
            margin-bottom: 26mm;
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
            width: 10px;
            height: 10px;
            background: #C42021;
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
            color: #154734;
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
            background: #154734;
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
            color: #154734;
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
            color: #154734;
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
            color: #154734;
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
            background: linear-gradient(135deg, #154734 0%, #1a5a42 100%);
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
      `
    });

    // Generate PDF with professional margins (CSS handles header/footer)
    console.log(`[PDF Generator] Generating PDF for ${type}`);
    const pdfBytes = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '18mm',
        right: '14mm',
        bottom: '22mm',
        left: '14mm',
      },
      displayHeaderFooter: false,
    });

    // Convert Uint8Array to Buffer
    const pdfBuffer = Buffer.from(pdfBytes);
    console.log(`[PDF Generator] PDF generated successfully, size: ${pdfBuffer.length} bytes`);
    return pdfBuffer;
    
  } catch (error) {
    console.error(`[PDF Generator] Error generating ${type} PDF:`, error);
    throw new Error(`Failed to generate ${type} PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (browser) {
      await browser.close();
    }
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
  baseUrl: string
): Promise<{
  interiors: Buffer;
  falseCeiling: Buffer;
  agreement: Buffer;
}> {
  console.log(`[PDF Generator] Generating all PDFs for quotation ${quotation.quoteId}`);
  
  try {
    // Generate all three PDFs sequentially to avoid resource issues
    const interiors = await generateQuotationPDF(quotation, 'interiors', baseUrl);
    const falseCeiling = await generateQuotationPDF(quotation, 'false-ceiling', baseUrl);
    const agreement = await generateQuotationPDF(quotation, 'agreement', baseUrl);
    
    return {
      interiors,
      falseCeiling,
      agreement,
    };
  } catch (error) {
    console.error('[PDF Generator] Error generating all PDFs:', error);
    throw error;
  }
}
