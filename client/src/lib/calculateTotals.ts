import { safeN } from "./money";

export interface InteriorItem {
  totalPrice?: string | number | null;
}

export interface FalseCeilingItem {
  area?: string | number | null;
  totalPrice?: string | number | null;
}

export interface OtherItem {
  itemType: string;
  value?: string | number | null;
  totalPrice?: string | number | null;
}

export interface QuoteTotals {
  interiorsSubtotal: number;
  fcSubtotal: number;
  grandSubtotal: number;
  updatedAt: number;
}

/**
 * Calculate quote totals from all line items
 */
export function calculateQuoteTotals(
  interiorItems: InteriorItem[],
  falseCeilingItems: FalseCeilingItem[],
  otherItems: OtherItem[],
): QuoteTotals {
  // Interiors subtotal = sum of all interior item amounts
  const interiorsSubtotal = interiorItems.reduce((sum, item) => {
    return sum + safeN(item.totalPrice);
  }, 0);

  // FC subtotal = sum of FC room items + OTHERS items
  const fcRoomSubtotal = falseCeilingItems.reduce((sum, item) => {
    return sum + safeN(item.totalPrice);
  }, 0);

  const fcOthersSubtotal = otherItems.reduce((sum, item) => {
    return sum + safeN(item.totalPrice);
  }, 0);

  const fcSubtotal = fcRoomSubtotal + fcOthersSubtotal;

  // Grand subtotal = interiors + FC
  const grandSubtotal = interiorsSubtotal + fcSubtotal;

  return {
    interiorsSubtotal,
    fcSubtotal,
    grandSubtotal,
    updatedAt: Date.now(),
  };
}
