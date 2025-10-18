/**
 * TRECASA Design Studio - Centralized Content Constants
 * Single source of truth for all text, labels, and formatting across PDFs, UI, and exports
 */

// ============================================================================
// COMPANY INFORMATION
// ============================================================================
export const COMPANY = {
  name: "TRECASA DESIGN STUDIO",
  legalName: "TRECASA Design Studio",
  address: "H.No. 7-31, Shop No. C2, Phase-II, JPN Nagar, Miyapur, Hyderabad, Telangana - 500049",
  city: "Hyderabad",
  state: "Telangana",
  email: "contact@trecasainfra.com",
  phone: "+91 9059784422",
  website: "www.trecasadesignstudio.com",
  instagram: "@trecasa.designstudio",
} as const;

// ============================================================================
// SECTION TITLES
// ============================================================================
export const SECTIONS = {
  // Main sections
  interiors: "Interiors",
  falseCeiling: "False Ceiling",
  additionalWorks: "Additional Works", // Previously "Misc"
  
  // Document sections
  scopeOfWork: "Scope of Work",
  estimate: "Estimate",
  termsAndConditions: "Terms & Conditions",
  paymentSchedule: "Payment Schedule",
  
  // Room categories
  kitchen: "Kitchen",
  living: "Living",
  bedrooms: "Bedrooms",
  bathrooms: "Bathrooms",
  utility: "Utility",
  puja: "Puja",
} as const;

// ============================================================================
// SIGNATURE LABELS
// ============================================================================
export const SIGNATURES = {
  clientLabel: "Client Signature", // Left side - auto-filled with client name
  companyLabel: "Trecasa Design Studio – Authorized Signatory", // Right side
  dateLabel: "Date",
  companySealLabel: "Company Seal",
} as const;

// ============================================================================
// PAYMENT SCHEDULE
// ============================================================================
export const PAYMENT_MILESTONES = {
  token: {
    label: "Token",
    percentage: 10,
    description: "Initial deposit to commence project",
  },
  designFinalization: {
    label: "Design Finalisation",
    percentage: 60,
    description: "Upon approval of final designs and material selection",
  },
  midExecution: {
    label: "Mid Execution",
    percentage: 25,
    description: "At 50% project completion",
  },
  afterHandover: {
    label: "After Handover",
    percentage: 5,
    description: "Upon successful project completion and handover",
  },
} as const;

// ============================================================================
// TERMS & CONDITIONS TEMPLATE
// ============================================================================
export const TERMS_AND_CONDITIONS = {
  quoteValidityTemplate: (validUntilDate: string) => 
    `Quote Validity: Valid until ${validUntilDate}.`,
  
  disputeResolution: 
    "Dispute Resolution: Any disputes will be resolved through amicable discussion. If unresolved, disputes shall be subject to arbitration under the Indian Arbitration and Conciliation Act, 1996, with jurisdiction limited to courts in Hyderabad.",
  
  standardTerms: [
    "All prices are in Indian Rupees (₹) and are inclusive of GST unless otherwise stated.",
    "The quotation is valid for 30 days from the date of issue.",
    "A 10% token amount is required to confirm the project and commence work.",
    "Any changes to the scope of work after approval will be billed separately.",
    "Payment terms must be adhered to as per the schedule outlined above.",
    "Delays in client approvals or site readiness may impact the project timeline.",
    "The company is not responsible for defects arising from client-supplied materials.",
  ],
} as const;

// ============================================================================
// GREETING TEMPLATES
// ============================================================================
export const GREETINGS = {
  pdfHeader: (clientName: string) => `Hi ${clientName} & Family`,
  emailSubject: (quoteId: string, projectName: string) => 
    `Your Quotation ${quoteId} - ${projectName}`,
} as const;

// ============================================================================
// TABLE HEADERS
// ============================================================================
export const TABLE_HEADERS = {
  // Interior items table
  interiorItems: {
    description: "Description",
    dimensions: "L×H×W",
    sqft: "SQFT",
    coreMaterial: "Core Material",
    finish: "Finish",
    hardware: "Hardware",
    rate: "Rate (₹/sft)",
    amount: "Amount (₹)",
  },
  
  // False ceiling table
  falseCeiling: {
    description: "Description",
    area: "Area (sqft)",
    rate: "Rate (₹/sqft)",
    amount: "Amount (₹)",
  },
  
  // Summary table
  summary: {
    particulars: "Particulars",
    amount: "Amount (₹)",
  },
} as const;

// ============================================================================
// STATUS LABELS
// ============================================================================
export const STATUS = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  rejected: "Rejected",
} as const;

// ============================================================================
// QUOTE VALIDITY
// ============================================================================
export const QUOTE_VALIDITY_DAYS = 30;

// ============================================================================
// PDF FOOTER TEXT
// ============================================================================
export const PDF_FOOTER = {
  copyright: `© ${new Date().getFullYear()} TRECASA DESIGN STUDIO`,
  contact: `${COMPANY.website} | ${COMPANY.instagram}`,
  separator: " | ",
  redDot: "•", // Visual branding element
} as const;

// ============================================================================
// CURRENCY SYMBOLS
// ============================================================================
export const CURRENCY = {
  symbol: "₹",
  code: "INR",
  name: "Indian Rupee",
} as const;

// ============================================================================
// DATE FORMATS
// ============================================================================
export const DATE_FORMATS = {
  display: "D MMMM YYYY", // e.g., "1 November 2025"
  pdf: "D MMMM YYYY",
  short: "DD/MM/YYYY",
  iso: "YYYY-MM-DD",
} as const;
