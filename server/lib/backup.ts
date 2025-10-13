import JSZip from 'jszip';
import { storage } from '../storage';
import type { Quotation, InteriorItem, FalseCeilingItem, OtherItem } from '@shared/schema';
import { saveJSON, loadJSON, getDataDir } from './store';
import { generateAllQuotationPDFs } from './pdf-generator';
import fs from 'fs/promises';
import path from 'path';

interface QuoteBackupData {
  quotation: Quotation;
  interiorItems: InteriorItem[];
  falseCeilingItems: FalseCeilingItem[];
  otherItems: OtherItem[];
}

export async function createQuoteBackupZip(quotationId: string, baseUrl: string): Promise<Buffer> {
  const zip = new JSZip();
  
  // Fetch quote data
  const quotation = await storage.getQuotation(quotationId);
  if (!quotation) {
    throw new Error('Quotation not found');
  }
  
  const interiorItems = await storage.getInteriorItems(quotationId);
  const falseCeilingItems = await storage.getFalseCeilingItems(quotationId);
  const otherItems = await storage.getOtherItems(quotationId);
  
  // Create backup data object
  const backupData: QuoteBackupData = {
    quotation,
    interiorItems,
    falseCeilingItems,
    otherItems,
  };
  
  // Create folder structure
  const folderName = `Quote_${quotation.quoteId}`;
  const folder = zip.folder(folderName);
  
  if (!folder) {
    throw new Error('Failed to create ZIP folder');
  }
  
  // Add quote.json
  folder.file('quote.json', JSON.stringify(backupData, null, 2));
  
  // Generate and add PDFs
  console.log(`[Backup] Generating PDFs for ${quotation.quoteId}...`);
  try {
    const pdfs = await generateAllQuotationPDFs(quotation, baseUrl);
    
    folder.file('Interiors_Quotation.pdf', pdfs.interiors);
    folder.file('False_Ceiling_Quotation.pdf', pdfs.falseCeiling);
    folder.file('Service_Agreement.pdf', pdfs.agreement);
    
    console.log(`[Backup] PDFs generated successfully for ${quotation.quoteId}`);
  } catch (error) {
    console.error(`[Backup] Failed to generate PDFs for ${quotation.quoteId}:`, error);
    // Add error note if PDF generation fails
    folder.file('PDF_GENERATION_ERROR.txt',
      `Failed to generate PDFs automatically.\n\n` +
      `Error: ${error instanceof Error ? error.message : 'Unknown error'}\n\n` +
      `To manually generate PDFs:\n` +
      `1. Open this quote in the application\n` +
      `2. Navigate to the Print page\n` +
      `3. Download Interiors PDF\n` +
      `4. Download False Ceiling PDF\n` +
      `5. Download Agreement PDF from the Agreement page\n`
    );
  }
  
  // Add README
  folder.file('README.txt', 
    `Quote Backup for ${quotation.quoteId}\n\n` +
    `Client: ${quotation.clientName}\n` +
    `Project: ${quotation.projectName}\n` +
    `Status: ${quotation.status}\n\n` +
    `Contents:\n` +
    `- quote.json: Complete quotation data\n` +
    `- Interiors_Quotation.pdf: Interiors quotation PDF\n` +
    `- False_Ceiling_Quotation.pdf: False ceiling quotation PDF\n` +
    `- Service_Agreement.pdf: Service agreement PDF\n\n` +
    `To restore this quotation, import the quote.json file.\n`
  );
  
  // Generate ZIP
  const buffer = await zip.generateAsync({ type: 'nodebuffer' });
  return buffer;
}

export async function createAllDataBackupZip(userId: string, baseUrl: string): Promise<Buffer> {
  const zip = new JSZip();
  
  try {
    // Read all data files from the data directory
    const dataDir = getDataDir();
    
    // Try to read each file, if it doesn't exist, skip it
    const files = ['quotes.json', 'settings.json'];
    
    for (const filename of files) {
      try {
        const filepath = path.join(dataDir, filename);
        const data = await fs.readFile(filepath, 'utf-8');
        zip.file(filename, data);
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          console.error(`Failed to read ${filename}:`, error);
        }
      }
    }
    
    // Get all quotations and generate PDFs
    console.log('[Backup] Fetching all quotations for global backup...');
    const quotations = await storage.getQuotations(userId);
    
    if (quotations.length > 0) {
      const pdfsFolder = zip.folder('quotation_pdfs');
      if (pdfsFolder) {
        for (const quotation of quotations) {
          try {
            console.log(`[Backup] Generating PDFs for ${quotation.quoteId}...`);
            const pdfs = await generateAllQuotationPDFs(quotation, baseUrl);
            
            // Create a subfolder for each quotation
            const quoteFolder = pdfsFolder.folder(quotation.quoteId);
            if (quoteFolder) {
              quoteFolder.file('Interiors_Quotation.pdf', pdfs.interiors);
              quoteFolder.file('False_Ceiling_Quotation.pdf', pdfs.falseCeiling);
              quoteFolder.file('Service_Agreement.pdf', pdfs.agreement);
            }
            
            console.log(`[Backup] PDFs generated successfully for ${quotation.quoteId}`);
          } catch (error) {
            console.error(`[Backup] Failed to generate PDFs for ${quotation.quoteId}:`, error);
            // Continue with other quotations even if one fails
          }
        }
      }
    }
    
    // Add a readme
    zip.file('README.txt',
      `TRECASA Data Backup\n\n` +
      `This backup contains all application data in JSON format and PDF exports.\n\n` +
      `Files included:\n` +
      `- quotes.json: All quotations with items\n` +
      `- settings.json: Application settings\n` +
      `- quotation_pdfs/: Folder containing PDFs for all quotations\n\n` +
      `PDF Structure:\n` +
      `- quotation_pdfs/[Quote_ID]/Interiors_Quotation.pdf\n` +
      `- quotation_pdfs/[Quote_ID]/False_Ceiling_Quotation.pdf\n` +
      `- quotation_pdfs/[Quote_ID]/Service_Agreement.pdf\n\n` +
      `To restore:\n` +
      `1. Stop the application\n` +
      `2. Replace the files in the /data directory\n` +
      `3. Restart the application\n`
    );
    
    const buffer = await zip.generateAsync({ type: 'nodebuffer' });
    return buffer;
  } catch (error) {
    console.error('Failed to create backup:', error);
    throw error;
  }
}

// Backup database data to JSON files periodically
export async function backupDatabaseToFiles(userId: string): Promise<void> {
  try {
    // Get all quotations for the user
    const quotations = await storage.getQuotations(userId);
    
    // Create a map to store full quote data
    const quotesData: Record<string, QuoteBackupData> = {};
    
    for (const quotation of quotations) {
      const interiorItems = await storage.getInteriorItems(quotation.id);
      const falseCeilingItems = await storage.getFalseCeilingItems(quotation.id);
      const otherItems = await storage.getOtherItems(quotation.id);
      
      quotesData[quotation.id] = {
        quotation,
        interiorItems,
        falseCeilingItems,
        otherItems,
      };
    }
    
    // Save to quotes.json
    await saveJSON('quotes.json', quotesData);
    
    console.log(`[Backup] Saved ${quotations.length} quotes to quotes.json`);
  } catch (error) {
    console.error('[Backup] Failed to backup database:', error);
  }
}
