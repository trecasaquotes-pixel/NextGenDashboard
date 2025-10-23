/**
 * TRECASA Design Studio - Global Formatting Utilities
 * Centralized formatters for currency, dates, and numbers
 */

import { format, parse } from "date-fns";
import { CURRENCY, DATE_FORMATS } from "./constants";

// ============================================================================
// CURRENCY FORMATTING (Indian Numbering System)
// ============================================================================

/**
 * Format a number as Indian currency with proper lakhs/crores notation
 * Examples:
 *   1234 → ₹1,234.00
 *   12345 → ₹12,345.00
 *   123456 → ₹1,23,456.00
 *   1234567 → ₹12,34,567.00
 *   12345678 → ₹1,23,45,678.00
 */
export function formatINR(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return `${CURRENCY.symbol}0.00`;
  }

  // Handle negative values
  const isNegative = value < 0;
  const absValue = Math.abs(value);

  // Convert to string with 2 decimal places
  const numStr = absValue.toFixed(2);
  const [integerPart, decimalPart] = numStr.split(".");

  // Apply Indian numbering system
  let formattedInteger: string;

  if (integerPart.length <= 3) {
    // Numbers up to 999
    formattedInteger = integerPart;
  } else {
    // Separate last 3 digits
    const lastThree = integerPart.slice(-3);
    const remaining = integerPart.slice(0, -3);

    // Add commas every 2 digits for the remaining part
    const groups: string[] = [];
    let temp = remaining;
    while (temp.length > 0) {
      if (temp.length <= 2) {
        groups.unshift(temp);
        break;
      } else {
        groups.unshift(temp.slice(-2));
        temp = temp.slice(0, -2);
      }
    }

    formattedInteger = groups.join(",") + "," + lastThree;
  }

  const formatted = `${formattedInteger}.${decimalPart}`;
  return `${isNegative ? "-" : ""}${CURRENCY.symbol}${formatted}`;
}

/**
 * Format currency without decimal places (for whole amounts)
 */
export function formatINRWhole(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return `${CURRENCY.symbol}0`;
  }

  const rounded = Math.round(value);
  const formatted = formatINR(rounded);

  // Remove .00 from the end
  return formatted.replace(".00", "");
}

/**
 * Format just the number part without currency symbol (useful for tables)
 */
export function formatIndianNumber(value: number | null | undefined): string {
  const formatted = formatINR(value);
  return formatted.replace(CURRENCY.symbol, "");
}

// ============================================================================
// DATE FORMATTING
// ============================================================================

/**
 * Format date as "D Month YYYY" (e.g., "1 November 2025")
 * @param date - Date object, ISO string, or date string
 */
export function formatDisplayDate(date: Date | string | null | undefined): string {
  if (!date) return "";

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;

    // Format: 1 November 2025
    return format(dateObj, "d MMMM yyyy");
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
}

/**
 * Format date for PDFs - same as display date
 */
export function formatPDFDate(date: Date | string | null | undefined): string {
  return formatDisplayDate(date);
}

/**
 * Format date as DD/MM/YYYY (short format)
 */
export function formatShortDate(date: Date | string | null | undefined): string {
  if (!date) return "";

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return format(dateObj, "dd/MM/yyyy");
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
}

/**
 * Calculate validity date (30 days from given date)
 */
export function calculateValidityDate(fromDate: Date | string): Date {
  const baseDate = typeof fromDate === "string" ? new Date(fromDate) : fromDate;
  const validityDate = new Date(baseDate);
  validityDate.setDate(validityDate.getDate() + 30);
  return validityDate;
}

/**
 * Format validity date string for T&C
 * Example: "Valid until 1 November 2025"
 */
export function formatValidityDateString(issueDate: Date | string): string {
  const validityDate = calculateValidityDate(issueDate);
  return formatDisplayDate(validityDate);
}

// ============================================================================
// PERCENTAGE FORMATTING
// ============================================================================

/**
 * Format percentage with % sign
 */
export function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "0%";
  }

  return `${value}%`;
}

// ============================================================================
// DIMENSION FORMATTING
// ============================================================================

/**
 * Format dimensions as L×H×W
 */
export function formatDimensions(
  length: number | null | undefined,
  height: number | null | undefined,
  width: number | null | undefined,
): string {
  const l = length ?? 0;
  const h = height ?? 0;
  const w = width ?? 0;

  return `${l}×${h}×${w}`;
}

// ============================================================================
// AREA FORMATTING
// ============================================================================

/**
 * Format area with unit
 */
export function formatArea(sqft: number | null | undefined): string {
  if (sqft === null || sqft === undefined || isNaN(sqft)) {
    return "0 sqft";
  }

  return `${sqft.toFixed(2)} sqft`;
}

/**
 * Format area as number only (no unit)
 */
export function formatAreaNumber(sqft: number | null | undefined): string {
  if (sqft === null || sqft === undefined || isNaN(sqft)) {
    return "0";
  }

  return sqft.toFixed(2);
}
