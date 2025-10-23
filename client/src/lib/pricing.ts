/**
 * Pricing Calculation Utility for Interior Items
 *
 * Base Rate Model (SFT only, no RFT):
 * - HANDMADE: ₹1300/sft
 * - FACTORY: ₹1500/sft
 *
 * Brand/Finish Adjustments (additive):
 * - Core material: NOT "Generic Ply" → +₹100
 * - Finish: NOT "Generic Laminate (Nimmi)" → +₹100
 * - Finish = "Acrylic" → +₹200 (replaces +₹100)
 * - Hardware: NOT "Generic" → +₹100
 */

export type BuildType = "handmade" | "factory";

/**
 * Calculate rate per square foot based on build type and material selections
 *
 * @param buildType - Work type: handmade (work-on-site) or factory (factory finish)
 * @param core - Core material brand (Generic Ply, Century Ply, Greenply, etc.)
 * @param finish - Finish brand (Generic Laminate (Nimmi), Acrylic, Greenlam, Merino, etc.)
 * @param hardware - Hardware brand (Generic, Hettich, Häfele, Ebco, Sleek, etc.)
 * @returns Rate per square foot in rupees
 */
export function calculateRatePerSqft(
  buildType: BuildType,
  core: string,
  finish: string,
  hardware: string,
): number {
  // Base rate
  const baseRate = buildType === "handmade" ? 1300 : 1500;

  // Core material adjustment (Generic Ply = 0, all others = +100)
  const coreAdj = core === "Generic Ply" ? 0 : 100;

  // Finish adjustment
  let finishAdj = 0;
  if (finish === "Acrylic") {
    finishAdj = 200; // Special pricing for Acrylic
  } else if (finish === "Generic Laminate" || finish === "Generic Laminate (Nimmi)") {
    finishAdj = 0; // Generic laminates have no adjustment
  } else {
    finishAdj = 100; // Standard adjustment for non-generic finishes
  }

  // Hardware adjustment (Generic or Nimmi = 0, all others = +100)
  const hardwareAdj = hardware === "Generic" || hardware === "Nimmi" ? 0 : 100;

  return baseRate + coreAdj + finishAdj + hardwareAdj;
}

/**
 * Get the effective rate considering override
 *
 * @param rateAuto - Auto-computed rate from buildType + brands
 * @param rateOverride - User-entered manual rate (nullable)
 * @param isRateOverridden - Whether override is active
 * @returns Effective rate to use for calculations
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
 * Calculate total price for an interior item
 *
 * @param buildType - Work type: handmade or factory
 * @param core - Core material brand
 * @param finish - Finish brand
 * @param hardware - Hardware brand
 * @param sqft - Area in square feet
 * @param rateOverride - Optional user-entered manual rate
 * @param isRateOverridden - Whether override is active
 * @returns Total price in rupees
 */
export function calculateItemTotal(
  buildType: BuildType,
  core: string,
  finish: string,
  hardware: string,
  sqft: number,
  rateOverride?: number | null,
  isRateOverridden?: boolean,
): number {
  const rateAuto = calculateRatePerSqft(buildType, core, finish, hardware);
  const effectiveRate = getEffectiveRate(rateAuto, rateOverride, isRateOverridden || false);
  return effectiveRate * sqft;
}

/**
 * Check if an item description indicates it should always use handmade pricing
 * regardless of project build type
 *
 * @param description - Item description
 * @returns True if item should always use handmade pricing
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
 *
 * @param projectBuildType - Project-level build type
 * @param description - Item description
 * @returns Effective build type to use for pricing
 */
export function getEffectiveBuildType(projectBuildType: BuildType, description: string): BuildType {
  // Custom wall highlights/paneling are always handmade
  if (isAlwaysHandmade(description)) {
    return "handmade";
  }
  return projectBuildType;
}
