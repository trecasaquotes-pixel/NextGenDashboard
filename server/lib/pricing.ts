/**
 * Server-side Pricing Calculation for Interior Items
 * 
 * This module ensures all financial calculations are performed server-side
 * with deterministic results, proper decimal precision, and validation.
 * 
 * Base Rate Model (SFT only):
 * - HANDMADE: ₹1300/sft
 * - FACTORY: ₹1500/sft
 * 
 * Brand/Finish Adjustments (additive):
 * - Core material: NOT "Generic Ply" → +₹100
 * - Finish: NOT "Generic Laminate (Nimmi)" → +₹100
 * - Finish = "Acrylic" → +₹200 (replaces +₹100)
 * - Hardware: NOT "Generic" → +₹100
 */

export type BuildType = 'handmade' | 'factory';
export type CalcType = 'SQFT' | 'COUNT' | 'LSUM';

/**
 * Calculate rate per square foot based on build type and material selections
 */
export function calculateRatePerSqft(
  buildType: BuildType,
  core: string,
  finish: string,
  hardware: string
): number {
  // Base rate
  const baseRate = buildType === 'handmade' ? 1300 : 1500;
  
  // Core material adjustment (Generic Ply = 0, all others = +100)
  const coreAdj = core === 'Generic Ply' ? 0 : 100;
  
  // Finish adjustment
  let finishAdj = 0;
  if (finish === 'Acrylic') {
    finishAdj = 200; // Special pricing for Acrylic
  } else if (finish === 'Generic Laminate' || finish === 'Generic Laminate (Nimmi)') {
    finishAdj = 0; // Generic laminates have no adjustment
  } else {
    finishAdj = 100; // Standard adjustment for non-generic finishes
  }
  
  // Hardware adjustment (Generic or Nimmi = 0, all others = +100)
  const hardwareAdj = (hardware === 'Generic' || hardware === 'Nimmi') ? 0 : 100;
  
  return baseRate + coreAdj + finishAdj + hardwareAdj;
}

/**
 * Calculate square footage based on calculation type and dimensions
 */
export function calculateSqft(
  calc: CalcType,
  length: number,
  height: number,
  width: number
): number {
  switch (calc) {
    case 'SQFT':
      // For SQFT: L × H
      return length * height;
    
    case 'COUNT':
      // For COUNT: use width as quantity, L × H gives area per unit
      const areaPerUnit = length * height;
      return areaPerUnit * width;
    
    case 'LSUM':
      // For LSUM (running feet): L + W + H (total linear measurement)
      // This is a linear measurement, not area, but stored in sqft field
      return length + width + height;
    
    default:
      return 0;
  }
}

/**
 * Get the effective rate considering override
 */
export function getEffectiveRate(
  rateAuto: number,
  rateOverride: number | null | undefined,
  isRateOverridden: boolean
): number {
  if (isRateOverridden && rateOverride != null && rateOverride > 0) {
    return rateOverride;
  }
  return rateAuto;
}

/**
 * Check if an item description indicates it should always use handmade pricing
 */
export function isAlwaysHandmade(description: string): boolean {
  const desc = description.toLowerCase();
  return desc.includes('custom wall highlight') || 
         desc.includes('custom wall paneling') ||
         desc.includes('wall highlights') ||
         desc.includes('wall paneling');
}

/**
 * Get the effective build type for an item, considering special cases
 */
export function getEffectiveBuildType(
  projectBuildType: BuildType,
  description: string
): BuildType {
  // Custom wall highlights/paneling are always handmade
  if (isAlwaysHandmade(description)) {
    return 'handmade';
  }
  return projectBuildType;
}

/**
 * Round to 2 decimal places for currency (rupees and paise)
 */
export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Normalize and calculate interior item data server-side
 * This ensures all pricing is accurate regardless of client-sent values
 */
export function normalizeInteriorItemData(data: {
  calc: string;
  length?: string | null;
  height?: string | null;
  width?: string | null;
  sqft?: string | null;
  buildType: string;
  material: string;
  finish: string;
  hardware: string;
  description?: string | null;
  rateOverride?: string | null;
  isRateOverridden?: boolean;
  [key: string]: any;
}): {
  sqft: string;
  rateAuto: string;
  unitPrice: string;
  totalPrice: string;
  [key: string]: any;
} {
  // Parse dimensions
  const length = parseFloat(data.length || '0');
  const height = parseFloat(data.height || '0');
  const width = parseFloat(data.width || '0');
  
  // Calculate square footage based on calc type
  const calc = (data.calc || 'SQFT') as CalcType;
  let sqft: number;
  
  if (calc === 'COUNT') {
    // For COUNT, use the sqft field directly (it stores quantity)
    sqft = parseFloat(data.sqft || '0');
  } else {
    // For SQFT and LSUM, calculate from dimensions
    sqft = calculateSqft(calc, length, height, width);
  }
  
  // Determine effective build type (considering wall items)
  const projectBuildType = (data.buildType || 'handmade') as BuildType;
  const description = data.description || '';
  const effectiveBuildType = getEffectiveBuildType(projectBuildType, description);
  
  // Calculate auto rate based on materials
  const rateAuto = calculateRatePerSqft(
    effectiveBuildType,
    data.material || 'Generic Ply',
    data.finish || 'Generic Laminate',
    data.hardware || 'Nimmi'
  );
  
  // Get effective rate (considering override)
  const rateOverride = data.rateOverride ? parseFloat(data.rateOverride) : null;
  const isRateOverridden = data.isRateOverridden || false;
  const unitPrice = getEffectiveRate(rateAuto, rateOverride, isRateOverridden);
  
  // Calculate total price
  const totalPrice = roundCurrency(unitPrice * sqft);
  
  // Discard any client-sent calculated values and return server-calculated ones
  const { 
    sqft: _discardedSqft, 
    rateAuto: _discardedRateAuto,
    unitPrice: _discardedUnitPrice, 
    totalPrice: _discardedTotal, 
    ...rest 
  } = data;
  
  return {
    ...rest,
    sqft: sqft.toFixed(2),
    rateAuto: rateAuto.toFixed(2),
    unitPrice: unitPrice.toFixed(2),
    totalPrice: totalPrice.toFixed(2),
  };
}
