# TRECASA - Interior Design Quotation Application

## Overview
TRECASA is a professional web application designed for interior designers to efficiently create, manage, and export detailed quotations. It supports room-based line items, material tracking with brand-based pricing, and robust PDF generation with comprehensive material specifications. The application aims to streamline the quotation process, providing a comprehensive tool for generating accurate, branded, and professional estimates to enhance the business operations of interior design studios.

## User Preferences
No specific user preferences were provided in the original document.

## System Architecture

### UI/UX Decisions
- **Branding**: TRECASA DESIGN STUDIO with a luxury aesthetic, deep green (#154734) header, gold (#C7A948) accents, red dot branding, and deep teal primary color.
- **Typography**: Montserrat for UI elements and Playfair Display (serif) for PDF headings and body text.
- **Components**: Shadcn UI with custom theming and Tailwind CSS for responsive design.
- **Universal PDF Header/Footer**: Standardized across all PDF exports (Interiors, False Ceiling, Agreement):
  - **Header**: 110px height, #154734 dark green background, two-column 70/30 grid layout. Left column: Company name (Montserrat SemiBold 15pt uppercase), full address (8.5pt), client/project details (9pt), greeting "Hi [Client] & Family" (Playfair Display Italic 9.5pt). Right column: Contact details (email/phone 8.5pt), Issue Date and Quote ID (9pt). Rounded top corners (8px).
  - **Footer**: 40px height, #C7A948 gold border-top (1px), centered text "© 2025 TRECASA DESIGN STUDIO | www.trecasadesignstudio.com | @trecasa.designstudio" with red dot indicator. Montserrat Regular 8pt, #666666 color.

### Technical Implementations
- **Frontend**: React with Wouter for routing, TanStack Query for server state management, and React Hook Form with Zod for form validation.
- **Backend**: Express.js server.
- **Database**: PostgreSQL with Drizzle ORM.
- **Authentication**: Replit Auth (OpenID Connect) for user sessions, with HMAC-SHA256 render tokens for server-side PDF generation.
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
- **Client Portal**: Secure, token-based system for sharing quotations with clients without authentication, allowing clients to view project details, financial summaries, terms, and accept quotations.
- **Project Management & Expense Tracking**: Automatically creates projects when quotations are approved. Tracks project expenses with real-time profit/loss calculations, comprehensive expense categorization, vendor/payment tracking, and financial summaries. Includes projects list with P&L overview and detailed project view with expense CRUD operations.
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