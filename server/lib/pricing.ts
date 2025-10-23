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
 * Brand/Finish Adjustments:
 * - Fetched from database brands table (adderPerSft field)
 * - Falls back to hardcoded values if brand not found
 */

export type BuildType = "handmade" | "factory";
export type CalcType = "SQFT" | "COUNT" | "LSUM";

export interface BrandLookup {
  [brandName: string]: number; // brandName -> adderPerSft
}

// Cache for brand pricing data
let cachedBrandLookup: BrandLookup | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 60000; // 1 minute cache

/**
 * Fetch and cache brand pricing data from database
 */
export async function getBrandPricingLookup(): Promise<BrandLookup> {
  const now = Date.now();
  
  // Return cached data if still fresh
  if (cachedBrandLookup && (now - lastFetchTime) < CACHE_TTL) {
    return cachedBrandLookup;
  }

  try {
    const { db } = await import("../db");
    const { brands } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    
    const activeBrands = await db.select().from(brands).where(eq(brands.isActive, true));
    
    const lookup: BrandLookup = {};
    activeBrands.forEach(brand => {
      lookup[brand.name] = brand.adderPerSft;
    });
    
    cachedBrandLookup = lookup;
    lastFetchTime = now;
    
    return lookup;
  } catch (error) {
    console.error("Error fetching brand pricing:", error);
    // Return empty lookup on error (will fall back to hardcoded values)
    return {};
  }
}

/**
 * Calculate rate per square foot based on build type and material selections
 * Uses database brand pricing if available, falls back to hardcoded values
 */
export async function calculateRatePerSqft(
  buildType: BuildType,
  core: string,
  finish: string,
  hardware: string,
): Promise<number> {
  // Base rate
  const baseRate = buildType === "handmade" ? 1300 : 1500;

  // Get brand pricing from database
  const brandLookup = await getBrandPricingLookup();

  // Core material adjustment
  const coreAdj = brandLookup[core] !== undefined ? brandLookup[core] : (core === "Generic Ply" ? 0 : 100);

  // Finish adjustment
  const finishAdj = brandLookup[finish] !== undefined ? brandLookup[finish] : 
    (finish === "Acrylic" ? 200 : 
     (finish === "Generic Laminate" || finish === "Generic Laminate (Nimmi)" ? 0 : 100));

  // Hardware adjustment
  const hardwareAdj = brandLookup[hardware] !== undefined ? brandLookup[hardware] :
    (hardware === "Generic" || hardware === "Nimmi" ? 0 : 100);

  return baseRate + coreAdj + finishAdj + hardwareAdj;
}

/**
 * Calculate square footage based on calculation type and dimensions
 */
export function calculateSqft(
  calc: CalcType,
  length: number,
  height: number,
  width: number,
): number {
  switch (calc) {
    case "SQFT":
      // For SQFT: L × H
      return length * height;

    case "COUNT":
      // For COUNT: use width as quantity, L × H gives area per unit
      const areaPerUnit = length * height;
      return areaPerUnit * width;

    case "LSUM":
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
  isRateOverridden: boolean,
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
  return (
    desc.includes("custom wall highlight") ||
    desc.includes("custom wall paneling") ||
    desc.includes("wall highlights") ||
    desc.includes("wall paneling")
  );
}

/**
 * Get the effective build type for an item, considering special cases
 */
export function getEffectiveBuildType(projectBuildType: BuildType, description: string): BuildType {
  // Custom wall highlights/paneling are always handmade
  if (isAlwaysHandmade(description)) {
    return "handmade";
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
export async function normalizeInteriorItemData(data: {
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
}): Promise<{
  sqft: string;
  rateAuto: string;
  unitPrice: string;
  totalPrice: string;
  [key: string]: any;
}> {
  // Parse dimensions
  const length = parseFloat(data.length || "0");
  const height = parseFloat(data.height || "0");
  const width = parseFloat(data.width || "0");

  // Calculate square footage based on calc type
  const calc = (data.calc || "SQFT") as CalcType;
  let sqft: number;

  if (calc === "COUNT") {
    // For COUNT, use the sqft field directly (it stores quantity)
    sqft = parseFloat(data.sqft || "0");
  } else {
    // For SQFT and LSUM, calculate from dimensions
    sqft = calculateSqft(calc, length, height, width);
  }

  // Determine effective build type (considering wall items)
  const projectBuildType = (data.buildType || "handmade") as BuildType;
  const description = data.description || "";
  const effectiveBuildType = getEffectiveBuildType(projectBuildType, description);

  // Calculate auto rate based on materials (now async with database lookup)
  const rateAuto = await calculateRatePerSqft(
    effectiveBuildType,
    data.material || "Generic Ply",
    data.finish || "Generic Laminate",
    data.hardware || "Nimmi",
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
