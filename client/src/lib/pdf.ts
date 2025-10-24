import html2pdf from "html2pdf.js";
import { PDFDocument, grayscale } from "pdf-lib";

export async function htmlToPdfBytes(rootEl: HTMLElement): Promise<Uint8Array> {
  // Add marker class for PDF generation mode
  // Note: .cover-page elements stay hidden (CSS keeps them display: none)
  // Only the green .pdf-header will appear in client-side PDFs
  rootEl.classList.add("pdf-export-mode");

  // Match Puppeteer margins: 80px top, 60px bottom, 18mm (68px) left/right
  // Convert px to mm at 96 DPI: 80px = 21.17mm, 60px = 15.88mm
  const opt = {
    margin: [21, 18, 16, 18] as [number, number, number, number], // top, right, bottom, left in mm
    filename: "temp.pdf",
    image: { type: "jpeg" as const, quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
    },
    jsPDF: {
      unit: "mm",
      format: "a4",
      orientation: "portrait" as const,
      compress: true,
    },
    pagebreak: { mode: ["avoid-all", "css", "legacy"] },
  };

  // Generate PDF using html2pdf
  const instance = html2pdf().set(opt).from(rootEl);
  await instance.toPdf();
  const pdf = await instance.get("pdf");

  // Detect and remove trailing blank page if present
  const pageCount = pdf.internal.getNumberOfPages();
  if (pageCount > 1) {
    // Check if last page is likely empty by inspecting its content stream
    // jsPDF stores page content as a string in pdf.internal.pages[pageNum]
    const lastPageContent = pdf.internal.pages[pageCount];
    
    // A truly blank page has minimal content (just structural commands, no real drawing ops)
    // Typical blank page is just a few bytes of basic PDF commands
    const isLastPageEmpty = typeof lastPageContent === 'string' && 
                           lastPageContent.trim().length < 100;
    
    if (isLastPageEmpty) {
      console.log(`[PDF] Removing trailing blank page ${pageCount} (content length: ${lastPageContent?.length || 0})`);
      pdf.deletePage(pageCount);
    }
  }

  // Get PDF as array buffer
  const pdfOutput = pdf.output("arraybuffer");
  
  // Clean up
  rootEl.classList.remove("pdf-export-mode");

  return new Uint8Array(pdfOutput);
}

export async function mergePdfBytes(docs: Uint8Array[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  for (const docBytes of docs) {
    const pdf = await PDFDocument.load(docBytes);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => {
      mergedPdf.addPage(page);
    });
  }

  console.log(`[PDF] Merged ${docs.length} documents. Total pages before cleanup: ${mergedPdf.getPageCount()}`);

  // Minimal safe cleanup: remove pages with no content streams and no annotations
  // Only targets truly empty placeholder pages created during merge
  await removeTriviallyEmptyPages(mergedPdf);

  console.log(`[PDF] Final page count after cleanup: ${mergedPdf.getPageCount()}`);

  return await mergedPdf.save();
}

/**
 * Remove only pages that are trivially empty (no content streams, no annotations)
 * This is a minimal, safe guard against merge-created placeholder pages
 */
async function removeTriviallyEmptyPages(pdfDoc: PDFDocument): Promise<void> {
  const pagesToRemove: number[] = [];
  const pageCount = pdfDoc.getPageCount();

  for (let i = 0; i < pageCount; i++) {
    try {
      const page = pdfDoc.getPage(i);
      const pageNode = page.node;
      
      // Check if page has content streams
      const contentsRef = pageNode.Contents();
      const hasContents = !!contentsRef;
      
      // Check if page has annotations
      const annotsRef = pageNode.Annots();
      const hasAnnots = !!annotsRef;

      // Only remove if BOTH content and annotations are absent
      if (!hasContents && !hasAnnots) {
        console.log(`[PDF] Marking trivially empty page ${i + 1} for removal`);
        pagesToRemove.push(i);
      }
    } catch (error) {
      // If we can't analyze, keep the page to be safe
      console.log(`[PDF] Could not analyze page ${i + 1}, keeping it:`, error);
    }
  }

  // Remove from end to start to maintain correct indices
  if (pagesToRemove.length > 0) {
    pagesToRemove.reverse().forEach(idx => {
      console.log(`[PDF] Removing trivially empty page ${idx + 1}`);
      pdfDoc.removePage(idx);
    });
    console.log(`[PDF] Removed ${pagesToRemove.length} trivially empty pages`);
  }
}

export async function addContinuousPageNumbers(pdfBytes: Uint8Array): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;

  for (let i = 0; i < totalPages; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();
    const pageNumber = i + 1;
    const text = `Page ${pageNumber} of ${totalPages}`;
    
    page.drawText(text, {
      x: width / 2 - 30,
      y: 15,
      size: 9,
      color: grayscale(0.5),
    });
  }

  return await pdfDoc.save();
}

export async function downloadBytesAs(filename: string, bytes: Uint8Array) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
