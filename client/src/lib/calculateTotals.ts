import { safeN } from "./money";

export interface InteriorItem {
  totalPrice?: string | number | null;
}

export interface FalseCeilingItem {
  area?: string | number | null;
  // Future: rate, totalPrice when FC pricing is implemented
}

export interface OtherItem {
  itemType: string;
  value?: string | number | null;
  // Future: rate, totalPrice fields
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
  otherItems: OtherItem[]
): QuoteTotals {
  // Interiors subtotal = sum of all interior item amounts
  const interiorsSubtotal = interiorItems.reduce((sum, item) => {
    return sum + safeN(item.totalPrice);
  }, 0);

  // FC subtotal = sum of FC room items + OTHERS items
  // For now, FC room items don't have pricing (placeholder for Week 2/3)
  // OTHERS items also don't have pricing yet (placeholder)
  const fcRoomSubtotal = 0; // Future: sum of falseCeilingItems totalPrice
  const fcOthersSubtotal = 0; // Future: sum of otherItems totalPrice
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
