import type { IStorage } from '../storage';

/**
 * Calculate totalPrice for a false ceiling item from its canonical dimensions
 * This ensures totals are always accurate regardless of client-sent values
 */
function calculateFCItemTotal(item: {
  length?: string | null;
  width?: string | null;
  unitPrice?: string | null;
}): number {
  const length = parseFloat(item.length || '0');
  const width = parseFloat(item.width || '0');
  const unitPrice = parseFloat(item.unitPrice || '0');
  
  if (length <= 0 || width <= 0) return 0;
  
  const area = length * width;
  return area * unitPrice;
}

/**
 * Recalculate quotation totals from interior and false ceiling items
 * FC totals are recomputed from canonical dimensions to ensure accuracy
 */
export async function recalculateQuotationTotals(quotationId: string, storage: IStorage) {
  // Fetch all items
  const interiorItems = await storage.getInteriorItems(quotationId);
  const fcItems = await storage.getFalseCeilingItems(quotationId);
  
  // Calculate interiors subtotal (sum of all interior item amounts)
  const interiorsSubtotal = interiorItems.reduce((sum, item) => {
    const amount = parseFloat(item.amount || "0");
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);
  
  // Calculate false ceiling subtotal - recompute from canonical dimensions
  const fcSubtotal = fcItems.reduce((sum, item) => {
    return sum + calculateFCItemTotal(item);
  }, 0);
  
  // Calculate grand subtotal
  const grandSubtotal = interiorsSubtotal + fcSubtotal;
  
  // Update quotation with new totals
  await storage.updateQuotation(quotationId, {
    totals: {
      updatedAt: Date.now(),
      interiorsSubtotal,
      fcSubtotal,
      grandSubtotal,
    },
  });
  
  return {
    interiorsSubtotal,
    fcSubtotal,
    grandSubtotal,
  };
}
