import JSZip from "jszip";
import { storage } from "../storage";
import type { Quotation, InteriorItem, FalseCeilingItem, OtherItem } from "@shared/schema";
import { saveJSON, loadJSON, getDataDir } from "./store";
import { generateAllQuotationPDFs } from "./pdf-generator";
import { db } from "../db";
import { brands, globalRules, agreements } from "@shared/schema";
import { eq } from "drizzle-orm";
import fs from "fs/promises";
import path from "path";

interface QuoteBackupData {
  quotation: Quotation;
  interiorItems: InteriorItem[];
  falseCeilingItems: FalseCeilingItem[];
  otherItems: OtherItem[];
}

export async function buildQuoteZip(options: {
  quoteId: string;
  ensurePdfs?: boolean;
  baseUrl: string;
}): Promise<Buffer> {
  const { quoteId, ensurePdfs = true, baseUrl } = options;
  const zip = new JSZip();

  // 1) Load quote and related data
  const quotation = await storage.getQuotation(quoteId);
  if (!quotation) {
    throw new Error("Quotation not found");
  }

  const interiorItems = await storage.getInteriorItems(quoteId);
  const falseCeilingItems = await storage.getFalseCeilingItems(quoteId);
  const otherItems = await storage.getOtherItems(quoteId);

  // 2) Build or load snapshot
  let snapshotData: any = null;

  if (quotation.snapshotJson) {
    // Use existing snapshot (from approval)
    snapshotData = quotation.snapshotJson;
  } else {
    // Build live snapshot of current state
    const [allBrands, globalRulesData] = await Promise.all([
      db.select().from(brands).where(eq(brands.isActive, true)),
      db.select().from(globalRules).limit(1),
    ]);

    // Get brands used in this quote (extract from interior items)
    const brandsUsed = {
      materials: new Set<string>(),
      finishes: new Set<string>(),
      hardware: new Set<string>(),
    };

    interiorItems.forEach((item) => {
      if (item.material) brandsUsed.materials.add(item.material);
      if (item.finish) brandsUsed.finishes.add(item.finish);
      if (item.hardware) brandsUsed.hardware.add(item.hardware);
    });

    snapshotData = {
      globalRules: globalRulesData[0] || null,
      brandsSelected: {
        materials: Array.from(brandsUsed.materials),
        finishes: Array.from(brandsUsed.finishes),
        hardware: Array.from(brandsUsed.hardware),
      },
      brands: allBrands,
      timestamp: Date.now(),
    };
  }

  // 3) Prepare JSON files
  const quoteJson = {
    quotation,
    interiorItems,
    falseCeilingItems,
    otherItems,
    createdAt: quotation.createdAt ? new Date(quotation.createdAt).toISOString() : null,
    updatedAt: quotation.updatedAt ? new Date(quotation.updatedAt).toISOString() : null,
  };

  const filesList: string[] = [];

  // Create folder structure
  const quoteFolder = zip.folder("quote");
  const pdfsFolder = zip.folder("pdfs");

  if (!quoteFolder || !pdfsFolder) {
    throw new Error("Failed to create ZIP folders");
  }

  // Add JSON files to /quote/
  quoteFolder.file("quote.json", JSON.stringify(quoteJson, null, 2));
  filesList.push("quote/quote.json");

  quoteFolder.file("snapshot.json", JSON.stringify(snapshotData, null, 2));
  filesList.push("quote/snapshot.json");

  // 4) Handle PDFs
  let pdfGenerationError: string | null = null;
  if (ensurePdfs) {
    try {
      const pdfs = await generateAllQuotationPDFs(quotation, baseUrl);

      // Add Interiors PDF
      if (pdfs.interiors) {
        pdfsFolder.file("interiors.pdf", pdfs.interiors);
        filesList.push("pdfs/interiors.pdf");
      }

      // Add False Ceiling PDF
      if (pdfs.falseCeiling) {
        pdfsFolder.file("false-ceiling.pdf", pdfs.falseCeiling);
        filesList.push("pdfs/false-ceiling.pdf");
      }

      // Add Agreement PDF if approved
      if (quotation.status === "approved" && pdfs.agreement) {
        pdfsFolder.file("agreement.pdf", pdfs.agreement);
        filesList.push("pdfs/agreement.pdf");
      }
    } catch (error) {
      console.error("[buildQuoteZip] PDF generation failed, continuing without PDFs:", error);
      pdfGenerationError = error instanceof Error ? error.message : "Unknown error";
      // Continue without PDFs instead of throwing
    }
  }

  // Add files.json listing
  quoteFolder.file("files.json", JSON.stringify(filesList, null, 2));

  // 5) Add README.txt
  const timestamp = new Date().toISOString();
  const pdfFiles = filesList.filter((f) => f.endsWith(".pdf"));
  const readmeContent = `Trecasa Quote Backup
Generated: ${timestamp}
Quote ID: ${quotation.quoteId}

Files:
- quote/quote.json → Full quote data and totals
- quote/snapshot.json → Rate/brand/global rules snapshot
- quote/files.json → List of included files
- pdfs/*.pdf → Client-facing documents

${
  quotation.status === "approved"
    ? "Note: This is an APPROVED quote. It is locked to its snapshot; admin edits made later do not affect this backup."
    : "Note: This is a draft quote. Snapshot reflects current state at time of export."
}

PDF Files:
${pdfFiles.length > 0 ? pdfFiles.map((f) => `- ${f}`).join("\n") : "- No PDFs included"}${pdfGenerationError ? `\n\nPDF Generation Error:\n${pdfGenerationError}\n\nNote: PDFs can be generated from the Print page in the web app.` : ""}
`;

  quoteFolder.file("README.txt", readmeContent);

  // 6) Generate ZIP buffer
  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  return buffer;
}

export async function createQuoteBackupZip(quotationId: string, baseUrl: string): Promise<Buffer> {
  const zip = new JSZip();

  // Fetch quote data
  const quotation = await storage.getQuotation(quotationId);
  if (!quotation) {
    throw new Error("Quotation not found");
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
    throw new Error("Failed to create ZIP folder");
  }

  // Add quote.json
  folder.file("quote.json", JSON.stringify(backupData, null, 2));

  // Generate and add PDFs
  console.log(`[Backup] Generating PDFs for ${quotation.quoteId}...`);
  try {
    const pdfs = await generateAllQuotationPDFs(quotation, baseUrl);

    folder.file("Interiors_Quotation.pdf", pdfs.interiors);
    folder.file("False_Ceiling_Quotation.pdf", pdfs.falseCeiling);
    folder.file("Service_Agreement.pdf", pdfs.agreement);

    console.log(`[Backup] PDFs generated successfully for ${quotation.quoteId}`);
  } catch (error) {
    console.error(`[Backup] Failed to generate PDFs for ${quotation.quoteId}:`, error);
    // Add error note if PDF generation fails
    folder.file(
      "PDF_GENERATION_ERROR.txt",
      `Failed to generate PDFs automatically.\n\n` +
        `Error: ${error instanceof Error ? error.message : "Unknown error"}\n\n` +
        `To manually generate PDFs:\n` +
        `1. Open this quote in the application\n` +
        `2. Navigate to the Print page\n` +
        `3. Download Interiors PDF\n` +
        `4. Download False Ceiling PDF\n` +
        `5. Download Agreement PDF from the Agreement page\n`,
    );
  }

  // Add README
  folder.file(
    "README.txt",
    `Quote Backup for ${quotation.quoteId}\n\n` +
      `Client: ${quotation.clientName}\n` +
      `Project: ${quotation.projectName}\n` +
      `Status: ${quotation.status}\n\n` +
      `Contents:\n` +
      `- quote.json: Complete quotation data\n` +
      `- Interiors_Quotation.pdf: Interiors quotation PDF\n` +
      `- False_Ceiling_Quotation.pdf: False ceiling quotation PDF\n` +
      `- Service_Agreement.pdf: Service agreement PDF\n\n` +
      `To restore this quotation, import the quote.json file.\n`,
  );

  // Generate ZIP
  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  return buffer;
}

export async function createAllDataBackupZip(userId: string, baseUrl: string): Promise<Buffer> {
  const zip = new JSZip();

  try {
    // Read all data files from the data directory
    const dataDir = getDataDir();

    // Try to read each file, if it doesn't exist, skip it
    const files = ["quotes.json", "settings.json"];

    for (const filename of files) {
      try {
        const filepath = path.join(dataDir, filename);
        const data = await fs.readFile(filepath, "utf-8");
        zip.file(filename, data);
      } catch (error: any) {
        if (error.code !== "ENOENT") {
          console.error(`Failed to read ${filename}:`, error);
        }
      }
    }

    // Get all quotations and generate PDFs
    console.log("[Backup] Fetching all quotations for global backup...");
    const quotations = await storage.getQuotations(userId);

    if (quotations.length > 0) {
      const pdfsFolder = zip.folder("quotation_pdfs");
      if (pdfsFolder) {
        for (const quotation of quotations) {
          try {
            console.log(`[Backup] Generating PDFs for ${quotation.quoteId}...`);
            const pdfs = await generateAllQuotationPDFs(quotation, baseUrl);

            // Create a subfolder for each quotation
            const quoteFolder = pdfsFolder.folder(quotation.quoteId);
            if (quoteFolder) {
              quoteFolder.file("Interiors_Quotation.pdf", pdfs.interiors);
              quoteFolder.file("False_Ceiling_Quotation.pdf", pdfs.falseCeiling);
              quoteFolder.file("Service_Agreement.pdf", pdfs.agreement);
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
    zip.file(
      "README.txt",
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
        `3. Restart the application\n`,
    );

    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    return buffer;
  } catch (error) {
    console.error("Failed to create backup:", error);
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
    await saveJSON("quotes.json", quotesData);

    console.log(`[Backup] Saved ${quotations.length} quotes to quotes.json`);
  } catch (error) {
    console.error("[Backup] Failed to backup database:", error);
  }
}
