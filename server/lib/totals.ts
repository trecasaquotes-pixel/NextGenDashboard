import type { IStorage } from "../storage";

/**
 * Calculate totalPrice for a false ceiling item from its canonical dimensions
 * This ensures totals are always accurate regardless of client-sent values
 */
function calculateFCItemTotal(item: {
  length?: string | null;
  width?: string | null;
  unitPrice?: string | null;
}): number {
  const length = parseFloat(item.length || "0");
  const width = parseFloat(item.width || "0");
  const unitPrice = parseFloat(item.unitPrice || "0");

  if (length <= 0 || width <= 0) return 0;

  const area = length * width;
  return area * unitPrice;
}

/**
 * Calculate and normalize FC item data server-side
 * Overwrites client-sent area and totalPrice with server-calculated values
 */
export function normalizeFCItemData(data: {
  length?: string | null;
  width?: string | null;
  unitPrice?: string | null;
  [key: string]: any;
}): {
  area: string;
  totalPrice: string;
  [key: string]: any;
} {
  const length = parseFloat(data.length || "0");
  const width = parseFloat(data.width || "0");
  const unitPrice = parseFloat(data.unitPrice || "0");

  // Calculate area
  const area = length > 0 && width > 0 ? (length * width).toFixed(2) : "0.00";

  // Calculate total price
  const areaNum = parseFloat(area);
  const totalPrice = (areaNum * unitPrice).toFixed(2);

  // Return data with server-calculated values, discarding any client-sent area/totalPrice
  const { area: _discardedArea, totalPrice: _discardedTotal, ...rest } = data;

  return {
    ...rest,
    area,
    totalPrice,
  };
}

/**
 * Round to 2 decimal places for currency
 */
function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calculate discount amount from grand subtotal
 */
export function calculateDiscountAmount(
  grandSubtotal: number,
  discountType: string,
  discountValue: number,
): number {
  if (discountType === "percent") {
    return roundCurrency((grandSubtotal * discountValue) / 100);
  }
  return roundCurrency(discountValue); // Fixed amount - ensure proper rounding
}

/**
 * Calculate GST at 18% on the discounted amount
 */
export function calculateGSTAmount(amountAfterDiscount: number): number {
  return roundCurrency(amountAfterDiscount * 0.18);
}

/**
 * Recalculate quotation totals from interior and false ceiling items
 * FC totals are recomputed from canonical dimensions to ensure accuracy
 */
export async function recalculateQuotationTotals(quotationId: string, storage: IStorage) {
  // Fetch all items
  const interiorItems = await storage.getInteriorItems(quotationId);
  const fcItems = await storage.getFalseCeilingItems(quotationId);
  const quotation = await storage.getQuotation(quotationId);

  if (!quotation) {
    throw new Error("Quotation not found");
  }

  // Calculate interiors subtotal (sum of all interior item totals)
  const interiorsSubtotal = roundCurrency(
    interiorItems.reduce((sum, item) => {
      const total = parseFloat(item.totalPrice || "0");
      return sum + (isNaN(total) ? 0 : total);
    }, 0),
  );

  // Calculate false ceiling subtotal - recompute from canonical dimensions
  const fcSubtotal = roundCurrency(
    fcItems.reduce((sum, item) => {
      return sum + calculateFCItemTotal(item);
    }, 0),
  );

  // Calculate grand subtotal
  const grandSubtotal = roundCurrency(interiorsSubtotal + fcSubtotal);

  // Calculate discount and GST for validation purposes
  const discountType = quotation.discountType || "percent";
  const discountValue = parseFloat(quotation.discountValue || "0");
  const discountAmount = calculateDiscountAmount(grandSubtotal, discountType, discountValue);
  const afterDiscount = Math.max(0, roundCurrency(grandSubtotal - discountAmount));
  const gstAmount = calculateGSTAmount(afterDiscount);
  const finalTotal = roundCurrency(afterDiscount + gstAmount);

  // Update quotation with new totals
  await storage.updateQuotation(quotationId, {
    totals: {
      updatedAt: Date.now(),
      interiorsSubtotal,
      fcSubtotal,
      grandSubtotal,
      discountAmount,
      afterDiscount,
      gstAmount,
      finalTotal,
    },
  });

  return {
    interiorsSubtotal,
    fcSubtotal,
    grandSubtotal,
    discountAmount,
    afterDiscount,
    gstAmount,
    finalTotal,
  };
}
