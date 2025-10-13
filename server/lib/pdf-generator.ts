import puppeteer from 'puppeteer';
import type { Quotation } from '@shared/schema';

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

    // Navigate to the appropriate page
    let url: string;
    if (type === 'agreement') {
      url = `${baseUrl}/quotation/${quotation.id}/agreement`;
    } else {
      url = `${baseUrl}/quotation/${quotation.id}/print`;
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

    // Generate PDF
    console.log(`[PDF Generator] Generating PDF for ${type}`);
    const pdfBytes = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm',
      },
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
