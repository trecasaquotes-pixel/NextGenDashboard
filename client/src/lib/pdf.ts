import html2pdf from 'html2pdf.js';
import { PDFDocument } from 'pdf-lib';

export async function htmlToPdfBytes(rootEl: HTMLElement): Promise<Uint8Array> {
  const opt = {
    margin: [10, 10, 10, 10] as [number, number, number, number],
    filename: 'temp.pdf',
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { 
      scale: 2,
      useCORS: true,
      logging: false
    },
    jsPDF: { 
      unit: 'mm', 
      format: 'a4', 
      orientation: 'portrait' as const
    },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  };

  const pdfBlob = await html2pdf().set(opt).from(rootEl).outputPdf('blob');
  const arrayBuffer = await pdfBlob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
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

  return await mergedPdf.save();
}

export async function downloadBytesAs(filename: string, bytes: Uint8Array) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
