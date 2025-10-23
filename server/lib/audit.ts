import { db } from "../db";
import { auditLog } from "@shared/schema";
import { Request } from "express";

/**
 * Get admin user info from request
 * For now, uses authenticated user from session
 */
export function getAdminUser(req: Request): { userId: string; userEmail: string } {
  const user = (req as any).user;

  if (user && user.id) {
    return {
      userId: user.id,
      userEmail: user.email || "unknown@example.com",
    };
  }

  // Fallback for unauthenticated requests (shouldn't happen in protected routes)
  return {
    userId: "system",
    userEmail: "system@trecasa.com",
  };
}

/**
 * Log an audit entry
 */
export async function logAudit({
  userId,
  userEmail,
  section,
  action,
  targetId,
  summary,
  beforeJson,
  afterJson,
}: {
  userId: string;
  userEmail: string;
  section: "Rates" | "Templates" | "Brands" | "Painting&FC" | "GlobalRules";
  action: "CREATE" | "UPDATE" | "DELETE";
  targetId: string;
  summary: string;
  beforeJson?: any;
  afterJson?: any;
}) {
  await db.insert(auditLog).values({
    userId,
    userEmail,
    section,
    action,
    targetId,
    summary,
    beforeJson: beforeJson ? JSON.stringify(beforeJson) : null,
    afterJson: afterJson ? JSON.stringify(afterJson) : null,
  });
}

/**
 * Helper to create summary for rate changes
 */
export function createRateSummary(
  action: "CREATE" | "UPDATE" | "DELETE",
  before: any,
  after: any,
): string {
  if (action === "CREATE") {
    return `Created rate "${after.displayName || after.itemKey}" (${after.unit})`;
  } else if (action === "DELETE") {
    return `Deactivated rate "${before.displayName || before.itemKey}"`;
  } else {
    // UPDATE - find what changed
    const changes: string[] = [];

    if (before.displayName !== after.displayName) {
      changes.push(`name: "${before.displayName}" → "${after.displayName}"`);
    }
    if (before.handmadeRate !== after.handmadeRate) {
      changes.push(`handmade: ₹${before.handmadeRate} → ₹${after.handmadeRate}`);
    }
    if (before.factoryRate !== after.factoryRate) {
      changes.push(`factory: ₹${before.factoryRate} → ₹${after.factoryRate}`);
    }
    if (before.category !== after.category) {
      changes.push(`category: ${before.category} → ${after.category}`);
    }
    if (before.isActive !== after.isActive) {
      changes.push(
        `status: ${before.isActive ? "active" : "inactive"} → ${after.isActive ? "active" : "inactive"}`,
      );
    }

    if (changes.length === 0) {
      return `Updated rate "${after.displayName || after.itemKey}"`;
    }

    return `Updated rate "${after.displayName || after.itemKey}": ${changes.join(", ")}`;
  }
}

/**
 * Helper to create summary for template changes
 */
export function createTemplateSummary(
  action: "CREATE" | "UPDATE" | "DELETE",
  before: any,
  after: any,
): string {
  if (action === "CREATE") {
    return `Created template "${after.name}" (${after.category})`;
  } else if (action === "DELETE") {
    return `Deactivated template "${before.name}"`;
  } else {
    const changes: string[] = [];

    if (before.name !== after.name) {
      changes.push(`name: "${before.name}" → "${after.name}"`);
    }
    if (before.category !== after.category) {
      changes.push(`category: ${before.category} → ${after.category}`);
    }
    if (before.isActive !== after.isActive) {
      changes.push(
        `status: ${before.isActive ? "active" : "inactive"} → ${after.isActive ? "active" : "inactive"}`,
      );
    }

    if (changes.length === 0) {
      return `Updated template "${after.name}"`;
    }

    return `Updated template "${after.name}": ${changes.join(", ")}`;
  }
}

/**
 * Helper to create summary for brand changes
 */
export function createBrandSummary(
  action: "CREATE" | "UPDATE" | "DELETE",
  before: any,
  after: any,
): string {
  if (action === "CREATE") {
    return `Created ${after.type} brand "${after.name}" (adder: ₹${after.adderPerSft}/sft)`;
  } else if (action === "DELETE") {
    return `Deactivated ${before.type} brand "${before.name}"`;
  } else {
    const changes: string[] = [];

    if (before.name !== after.name) {
      changes.push(`name: "${before.name}" → "${after.name}"`);
    }
    if (before.adderPerSft !== after.adderPerSft) {
      changes.push(`adder: ₹${before.adderPerSft}/sft → ₹${after.adderPerSft}/sft`);
    }
    if (before.isDefault !== after.isDefault) {
      changes.push(
        `default: ${before.isDefault ? "yes" : "no"} → ${after.isDefault ? "yes" : "no"}`,
      );
    }
    if (before.isActive !== after.isActive) {
      changes.push(
        `status: ${before.isActive ? "active" : "inactive"} → ${after.isActive ? "active" : "inactive"}`,
      );
    }

    if (changes.length === 0) {
      return `Updated ${after.type} brand "${after.name}"`;
    }

    return `Updated ${after.type} brand "${after.name}": ${changes.join(", ")}`;
  }
}

/**
 * Helper to create summary for painting pack changes
 */
export function createPaintingPackSummary(
  action: "CREATE" | "UPDATE" | "DELETE",
  before: any,
  after: any,
): string {
  if (action === "CREATE") {
    return `Created painting pack "${after.name}" (base: ₹${after.basePriceLsum})`;
  } else if (action === "DELETE") {
    return `Deactivated painting pack "${before.name}"`;
  } else {
    const changes: string[] = [];

    if (before.name !== after.name) {
      changes.push(`name: "${before.name}" → "${after.name}"`);
    }
    if (before.basePriceLsum !== after.basePriceLsum) {
      changes.push(`base price: ₹${before.basePriceLsum} → ₹${after.basePriceLsum}`);
    }
    if (before.showInQuote !== after.showInQuote) {
      changes.push(
        `show in quote: ${before.showInQuote ? "yes" : "no"} → ${after.showInQuote ? "yes" : "no"}`,
      );
    }
    if (before.isActive !== after.isActive) {
      changes.push(
        `status: ${before.isActive ? "active" : "inactive"} → ${after.isActive ? "active" : "inactive"}`,
      );
    }

    if (changes.length === 0) {
      return `Updated painting pack "${after.name}"`;
    }

    return `Updated painting pack "${after.name}": ${changes.join(", ")}`;
  }
}

/**
 * Helper to create summary for FC catalog changes
 */
export function createFcCatalogSummary(
  action: "CREATE" | "UPDATE" | "DELETE",
  before: any,
  after: any,
): string {
  if (action === "CREATE") {
    return `Created FC item "${after.displayName}" (${after.unit})`;
  } else if (action === "DELETE") {
    return `Deactivated FC item "${before.displayName}"`;
  } else {
    const changes: string[] = [];

    if (before.displayName !== after.displayName) {
      changes.push(`name: "${before.displayName}" → "${after.displayName}"`);
    }
    if (before.ratePerUnit !== after.ratePerUnit) {
      changes.push(`rate: ₹${before.ratePerUnit} → ₹${after.ratePerUnit}`);
    }
    if (before.defaultValue !== after.defaultValue) {
      changes.push(`default: ${before.defaultValue} → ${after.defaultValue}`);
    }
    if (before.isActive !== after.isActive) {
      changes.push(
        `status: ${before.isActive ? "active" : "inactive"} → ${after.isActive ? "active" : "inactive"}`,
      );
    }

    if (changes.length === 0) {
      return `Updated FC item "${after.displayName}"`;
    }

    return `Updated FC item "${after.displayName}": ${changes.join(", ")}`;
  }
}

/**
 * Helper to create summary for global rules changes
 */
export function createGlobalRulesSummary(
  action: "CREATE" | "UPDATE" | "DELETE",
  before: any,
  after: any,
): string {
  if (action === "CREATE") {
    return `Initialized global rules configuration`;
  } else if (action === "DELETE") {
    return `Reset global rules to defaults`;
  } else {
    const changes: string[] = [];

    if (before.buildTypeDefault !== after.buildTypeDefault) {
      changes.push(`build type: ${before.buildTypeDefault} → ${after.buildTypeDefault}`);
    }
    if (before.gstPercent !== after.gstPercent) {
      changes.push(`GST: ${before.gstPercent}% → ${after.gstPercent}%`);
    }
    if (before.validityDays !== after.validityDays) {
      changes.push(`validity: ${before.validityDays} → ${after.validityDays} days`);
    }
    if (before.bedroomFactorBase !== after.bedroomFactorBase) {
      changes.push(`base BHK: ${before.bedroomFactorBase} → ${after.bedroomFactorBase}`);
    }
    if (before.perBedroomDelta !== after.perBedroomDelta) {
      changes.push(`per-bedroom delta: ${before.perBedroomDelta} → ${after.perBedroomDelta}`);
    }
    if (before.paymentScheduleJson !== after.paymentScheduleJson) {
      changes.push(`payment schedule updated`);
    }
    if (before.cityFactorsJson !== after.cityFactorsJson) {
      changes.push(`city factors updated`);
    }
    if (before.footerLine1 !== after.footerLine1 || before.footerLine2 !== after.footerLine2) {
      changes.push(`footer text updated`);
    }

    if (changes.length === 0) {
      return `Updated global rules configuration`;
    }

    return `Updated global rules: ${changes.join(", ")}`;
  }
}
