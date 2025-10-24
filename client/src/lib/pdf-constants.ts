/**
 * Brand Tokens for PDF Generation
 * Centralized constants for visual consistency across all PDFs
 */

export const PDF_BRAND_TOKENS = {
  // Brand Identity
  brandName: "TRECASA DESIGN STUDIO",
  brandShortName: "Trecasa Design Studio",
  
  // Colors
  redDot: "#E50914",           // Primary brand accent
  primaryGreen: "#154734",     // Header background
  borderGold: "#C7A948",       // Footer border
  textPrimary: "#666666",      // Body text
  textLight: "#999999",        // Muted text
  
  // Typography
  fontFamily: "'Montserrat', Arial, sans-serif",
  fontFamilySerif: "'Playfair Display', Georgia, serif",
  
  // Spacing
  headerHeight: "80px",
  footerHeight: "60px",
  marginTop: "80px",
  marginBottom: "60px",
  marginLeft: "18mm",
  marginRight: "18mm",
  
  // Sizes
  redDotSize: "8px",
  logoHeight: "40px",
  
  // Current year for footer
  currentYear: new Date().getFullYear(),
} as const;

export type PDFBrandTokens = typeof PDF_BRAND_TOKENS;
