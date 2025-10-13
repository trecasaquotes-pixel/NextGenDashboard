import JSZip from 'jszip';
import { storage } from '../storage';
import type { Quotation, InteriorItem, FalseCeilingItem, OtherItem } from '@shared/schema';
import { saveJSON, loadJSON, getDataDir } from './store';
import fs from 'fs/promises';
import path from 'path';

interface QuoteBackupData {
  quotation: Quotation;
  interiorItems: InteriorItem[];
  falseCeilingItems: FalseCeilingItem[];
  otherItems: OtherItem[];
}

export async function createQuoteBackupZip(quotationId: string): Promise<Buffer> {
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
  
  // Note: PDFs would need to be generated on the frontend
  // We'll add placeholder info files instead
  folder.file('README.txt', 
    `Quote Backup for ${quotation.quoteId}\n\n` +
    `Client: ${quotation.clientName}\n` +
    `Project: ${quotation.projectName}\n` +
    `Status: ${quotation.status}\n\n` +
    `To generate PDFs:\n` +
    `1. Open this quote in the application\n` +
    `2. Navigate to the Print page\n` +
    `3. Download Interiors PDF\n` +
    `4. Download False Ceiling PDF\n` +
    `5. Download Agreement PDF (if applicable)\n`
  );
  
  // Generate ZIP
  const buffer = await zip.generateAsync({ type: 'nodebuffer' });
  return buffer;
}

export async function createAllDataBackupZip(): Promise<Buffer> {
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
    
    // Add a readme
    zip.file('README.txt',
      `TRECASA Data Backup\n\n` +
      `This backup contains all application data in JSON format.\n\n` +
      `Files included:\n` +
      `- quotes.json: All quotations with items\n` +
      `- settings.json: Application settings\n\n` +
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
