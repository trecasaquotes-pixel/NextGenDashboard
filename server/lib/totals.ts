import type { IStorage } from '../storage';

export async function recalculateQuotationTotals(quotationId: string, storage: IStorage) {
  // Fetch all items
  const interiorItems = await storage.getInteriorItems(quotationId);
  const fcItems = await storage.getFalseCeilingItems(quotationId);
  
  // Calculate interiors subtotal
  const interiorsSubtotal = interiorItems.reduce((sum, item) => {
    const total = parseFloat(item.totalPrice || "0");
    return sum + (isNaN(total) ? 0 : total);
  }, 0);
  
  // Calculate false ceiling subtotal
  const fcSubtotal = fcItems.reduce((sum, item) => {
    const total = parseFloat(item.totalPrice || "0");
    return sum + (isNaN(total) ? 0 : total);
  }, 0);
  
  // Calculate grand subtotal
  const grandSubtotal = interiorsSubtotal + fcSubtotal;
  
  // Update quotation with new totals
  await storage.updateQuotation(quotationId, {
    totals: {
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
