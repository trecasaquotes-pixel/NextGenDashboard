# TRECASA - Interior Design Quotation Application

## Overview

TRECASA is a professional web application designed for interior designers to efficiently create, manage, and export detailed quotations. It supports room-based line items, material tracking with brand-based pricing, and robust PDF generation with comprehensive material specifications. The application aims to streamline the quotation process, providing a comprehensive tool for generating accurate, branded, and professional estimates to enhance the business operations of interior design studios.

## User Preferences

No specific user preferences were provided in the original document.

## System Architecture

### UI/UX Decisions

- **Branding**: TRECASA DESIGN STUDIO with a luxury aesthetic, deep green (#154734) header, gold (#C7A948) accents, red dot branding, deep teal primary color, and gold "TT" logo.
- **Typography**: Montserrat for UI elements and Playfair Display (serif) for PDF headings and body text.
- **Components**: Shadcn UI with custom theming and Tailwind CSS for responsive design.
- **Dashboard Navigation**: Top-level tabs for main sections (Change Orders, Projects & Expenses, Business & Insights) with Lucide icons and active state highlighting using TRECASA brand colors.
- **Universal PDF Header/Footer**: Standardized across all PDF exports (Interiors, False Ceiling, Agreement):
  - **Header**: 110px height, #154734 dark green background, two-column 70/30 grid layout. Left column: Company name (Montserrat SemiBold 15pt uppercase), full address (8.5pt), client/project details (9pt), greeting "Hi [Client] & Family" (Playfair Display Italic 9.5pt). Right column: Contact details (email/phone 8.5pt), Issue Date and Quote ID (9pt). Rounded top corners (8px).
  - **Footer**: 40px height, #C7A948 gold border-top (1px), centered text "© 2025 TRECASA DESIGN STUDIO | www.trecasadesignstudio.com | @trecasa.designstudio" with red dot indicator. Montserrat Regular 8pt, #666666 color.

### Technical Implementations

- **Frontend**: React with Wouter for routing, TanStack Query for server state management, and React Hook Form with Zod for form validation.
- **Backend**: Express.js server.
- **Database**: PostgreSQL with Drizzle ORM.
- **Authentication**: Replit Auth (OpenID Connect) for user sessions, with HMAC-SHA256 render tokens for server-side PDF generation.
- **Data Validation & Integrity**: Comprehensive server-side validation using Zod schemas with business rules:
  - **Project Info**: Required fields (client name 2+ chars, project name 3+ chars), email/phone format validation, build type enum
  - **Interior Items**: Description length (2-200 chars), dimension ranges (length 0-1000ft, height 0-100ft, width 0-1000ft), SQFT/quantity limits (0-100K), rate overrides (0-1M), calculation type enum validation
  - **False Ceiling**: Description validation, area (0-100K sqft), rate (0-100K) validation
  - **Discounts**: Percentage limits (0-100%), proper error messaging for validation failures
- **Pricing System**: Smart Rate Calculator incorporating brand-based pricing (Core Material, Finish, Hardware) and project-level "Build Type" (Handmade/Factory Finish) for real-time calculation updates. Special handling for wall-related items to always use handmade pricing.
- **Totals Calculation**: Real-time computation of subtotals, discounts, and GST.
- **Template System**: Auto-creation of room items based on project categories using predefined templates. Template changes propagate instantly across all pages (Scope, Estimate, Print, PDFs) through comprehensive cache invalidation and refetching.
- **PDF Generation**: Dual approach with client-side (html2pdf.js) and server-side (Puppeteer with Google Fonts, professional margins, header/footer templates) options. All PDFs feature universal header/footer design with consistent branding. Includes room summary tables and robust page break handling.
  - **Detailed Room-wise Breakdown**: Professional table design with Playfair Display Bold 11pt section title (#1A1A1A), room names in Playfair Display SemiBold 11pt (#154734). Tables feature light gray headers (#F2F2F2, 26px height), Montserrat SemiBold 8pt column labels, data rows with 24px min height and Montserrat Regular 7.5-8pt text. Includes comprehensive columns: Description, L×H×W (combined dimensions), SQFT, Core Material, Finish, Hardware, Rate (₹/sft), and Amount (₹). Room subtotal bars in dark green (#154734) with white text (26px height). Optimized column widths for complete material visibility without text clipping.
- **Render Token System**: HMAC-signed, time-limited tokens for secure Puppeteer access to protected pages.
- **Agreement Pack**: Functionality to merge multiple PDFs (service agreement, annexure, quotation) into a single document.
- **Backup & Export**: ZIP file generation for individual quotation backups (PDFs + JSON) and global data export.
- **Admin Interfaces**: Comprehensive CRUD interfaces for managing:
  - **Rates**: Interior item pricing, brand-based adders, unit guardrails.
  - **Templates**: Quotation templates with hierarchical room and item management, import/export.
  - **Brands & Add-ons**: Brand-specific pricing adders for materials and hardware.
  - **Painting & FC**: Painting packages with BHK-based scaling and False Ceiling catalog items.
  - **Global Rules**: Application-wide settings including pricing defaults, bedroom scaling, payment schedules, city factors, and footer branding.
- **Audit Log**: Comprehensive audit trail for all admin changes with user tracking, smart summaries, filtering, and diff viewing.
- **Version History**: Complete version tracking system for quotations that automatically creates snapshots on every change (create, update info, modify items, pricing changes, status changes). Shows chronological timeline with change summaries, change types (color-coded badges), timestamps, and version numbers. Accessible via History button in quotation header.
- **Quotation Locking**: Comprehensive concurrent edit protection system preventing data conflicts when multiple users access the same quotation:
  - **Auto-acquisition**: Lock automatically acquired when user opens quotation, released on page close
  - **Heartbeat mechanism**: 10-second heartbeat interval maintains lock, 30-second timeout for auto-expiry
  - **Strict enforcement**: Server-side lock verification on ALL mutation routes (quotations, interior/FC/other items)
  - **Expiry handling**: Expired locks auto-cleared from database; stale clients blocked from mutations and heartbeats
  - **UI indicators**: Lock status banner shows who holds lock; major action buttons disabled when locked by others
  - **Security**: 423 Locked responses with lock holder name; forced reacquisition after expiry prevents concurrent edits
- **Client Portal**: Secure, token-based system for sharing quotations with clients without authentication, allowing clients to view project details, financial summaries, terms, and accept quotations.
- **Project Management & Expense Tracking**: Dual workflow for project creation:
  - **Auto-creation**: Automatically creates projects when quotations are approved (quotationId populated, linked to original quote)
  - **Manual creation**: Users can create projects directly via "New Project" button with form validation (quotationId null, independent projects)
  - **Duplicate prevention**: Unique constraint on quotationId ensures approved quotations create projects only once
  - **Project tracking**: Comprehensive expense tracking with real-time profit/loss calculations, expense categorization, vendor/payment tracking, and financial summaries
  - **Project ID generation**: Auto-generated unique IDs in format TRE_PRJ_YYMMDD_XXXX using date + nanoid
  - **Projects list**: P&L overview with filterable views and detailed project cards showing contract amount, expenses, and profit/loss
  - **Expense management**: Full CRUD operations for project expenses with category-based tracking and payment documentation
- **Business Expenses Management**: Comprehensive overhead expense tracking system for monthly operational costs (rent, salaries, utilities, office supplies, marketing, insurance, maintenance, subscriptions, professional fees). Features include:
  - **Category-based tracking**: 11 predefined expense categories for business overhead
  - **Recurring expense support**: Mark expenses as recurring (Monthly, Quarterly, Yearly) for regular costs
  - **Payment tracking**: Vendor names, payment modes, dates, receipt numbers
  - **Statistical dashboard**: Real-time total expenses, category breakdown, monthly trends
  - **Category filtering**: Filter expenses by category for focused analysis
  - **Full CRUD operations**: Create, edit, and delete business expenses with validation

### Feature Specifications

- **Quotation Management**: Create, view, edit, and manage quotations with auto-generated unique IDs.
- **Project Information**: Capture client details, project category, address, and Build Type.
- **Scope Definition**: Room-based line items for Interiors (dimensions, materials, pricing) and False Ceiling (area calculations). Rooms are displayed in standard order (Kitchen, Living, Bedrooms, Bathrooms, Utility, Puja) followed by custom room names alphabetically.
- **Estimate Generation**: Detailed summaries, overall summary with discount and GST.
- **Print Functionality**: Print-friendly views and PDF export.
- **Quotes List**: Tabular display of quotations with project details and financial totals.
- **UX Enhancements**: Inline room totals, sticky footer bars, and improved dimension input.
- **Dynamic Terms & Conditions**: Template-based T&C with per-quote overrides, token substitution, and dynamic Materials & Brands bullets that auto-populate from actual quotation selections (Core Materials, Finishes, Hardware) with intelligent formatting and deduplication.
- **Signature Block & Status Controls**: Client and Trecasa signature system with status tracking (draft, sent, accepted, rejected).

## External Dependencies

- **Replit Auth**: User authentication and authorization.
- **PostgreSQL (Neon)**: Primary database.
- **TanStack Query**: Server state management.
- **Wouter**: React router.
- **React Hook Form**: Form management.
- **Zod**: Form validation.
- **Tailwind CSS**: Styling.
- **Shadcn UI**: UI component library.
- **Drizzle ORM**: ORM for PostgreSQL.
- **pdf-lib**: PDF manipulation (merging).
- **html2pdf.js**: Client-side HTML to PDF conversion.
- **JSZip**: ZIP archive creation.
