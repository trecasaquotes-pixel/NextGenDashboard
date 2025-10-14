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

    // Inject PDF-optimized CSS with Google Fonts
    await page.addStyleTag({
      content: `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Montserrat:wght@400;500&display=swap');
        
        @media print {
          body {
            font-family: 'Montserrat', sans-serif;
            font-size: 11px;
            color: #111;
            margin: 0;
            padding: 0;
          }
          
          h1, h2, h3, h4 {
            font-family: 'Playfair Display', serif;
            margin: 0;
          }
          
          .print-content {
            padding-top: 35mm !important;
            padding-bottom: 25mm !important;
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
          
          table {
            page-break-inside: auto;
          }
          
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          td {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          /* Typography refinements */
          .room-title {
            font-family: 'Playfair Display', serif;
            font-size: 14pt;
            font-weight: 700;
            color: #013220;
            margin-bottom: 8px;
          }
          
          .section-title {
            font-family: 'Playfair Display', serif;
            font-size: 12pt;
            font-weight: 700;
            color: #013220;
          }
          
          .summary-table th,
          .summary-table td {
            font-family: 'Montserrat', sans-serif;
            font-size: 10px;
          }
          
          .pdf-footer-content {
            font-size: 9px;
            color: #555;
            font-family: 'Montserrat', sans-serif;
          }
        }
      `
    });

    // Generate PDF with professional margins and header/footer
    console.log(`[PDF Generator] Generating PDF for ${type}`);
    const pdfBytes = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '25mm',
        right: '15mm',
        bottom: '18mm',
        left: '15mm',
      },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="width: 100%; font-size: 10px; padding: 0 15mm; margin-top: 10mm; display: flex; justify-content: space-between; align-items: center; font-family: 'Montserrat', sans-serif;">
          <div style="font-family: 'Playfair Display', serif; font-size: 14px; font-weight: 700; color: #013220;">
            TRECASA DESIGN STUDIO
          </div>
          <div style="text-align: right; color: #333; line-height: 1.3;">
            <div style="font-size: 9px; color: #666;">Quote ID: <span class="quoteId"></span></div>
          </div>
        </div>
      `,
      footerTemplate: `
        <div style="width: 100%; font-size: 9px; padding: 0 15mm 10mm; display: flex; justify-content: space-between; align-items: center; border-top: 0.2pt solid #ddd; padding-top: 4px; color: #555; font-family: 'Montserrat', sans-serif;">
          <div>TRECASA Design Studio | Luxury Interiors | Architecture | Build</div>
          <div style="display: flex; align-items: center; gap: 4px;">
            <span style="color: #d92027; font-size: 12px;">●</span>
          </div>
          <div>www.trecasadesignstudio.com | Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>
        </div>
      `,
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
