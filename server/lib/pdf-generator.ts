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

    // Inject PDF-optimized CSS with Google Fonts and Part 2 enhancements
    await page.addStyleTag({
      content: `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Montserrat:wght@400;500;600&display=swap');
        
        @page {
          size: A4;
          margin: 18mm 14mm 22mm;
        }
        
        @media print {
          body {
            font-family: 'Montserrat', Arial, sans-serif;
            font-size: 11px;
            color: #1E2F28;
            margin: 0;
            padding: 0;
          }
          
          h1, h2, h3, h4, .final-total {
            font-family: 'Playfair Display', Georgia, serif;
          }
          
          /* Fixed header & footer that repeat across pages */
          .pdf-header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 1000;
          }
          
          .pdf-footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 18mm;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-family: 'Montserrat', Arial, sans-serif;
            font-size: 10px;
            color: #1E2F28;
            padding: 0 14mm;
            border-top: 2px solid #D4AF37;
            background: white;
            z-index: 1000;
          }
          
          /* Part 2D: Page numbers in footer */
          .pdf-footer .page-num::after {
            content: "Page " counter(page) " of " counter(pages);
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
            background: #B02A2A;
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
          
          /* Part 2E: Room block to prevent title/row separation */
          .room-block {
            page-break-inside: avoid;
          }
          
          .room-title {
            margin: 10mm 0 4mm;
            font-weight: 700;
            font-family: 'Playfair Display', Georgia, serif;
            font-size: 14pt;
            color: #013220;
          }
          
          .room-table {
            page-break-inside: auto;
          }
          
          /* Room subtotal styling */
          .room-subtotal {
            background: #0F3A2B;
            color: #FFFFFF;
            font-weight: 600;
          }
          
          .room-subtotal td {
            padding-top: 8px;
            padding-bottom: 8px;
            border-top: 1px solid #0A2A1F;
          }
          
          /* Part 2A: Summary section styles */
          .summary-section h2 {
            font-family: 'Playfair Display', Georgia, serif;
            font-weight: 700;
            color: #0F3A2B;
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
            border-top: 2px solid #D4AF37;
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
            border-top: 2px solid #D4AF37;
            padding-top: 6px;
            font-size: 18px;
            font-weight: 700;
            font-family: 'Playfair Display', Georgia, serif;
            color: #0F3A2B;
          }
          
          /* Section title */
          .section-title {
            font-family: 'Playfair Display', Georgia, serif;
            font-size: 12pt;
            font-weight: 700;
            color: #013220;
          }
          
          .header-meta {
            font-family: 'Montserrat', Arial, sans-serif;
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
