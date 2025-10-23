# TRECASA - Interior Design Quotation Application

## Overview

TRECASA is a web application for interior designers to create, manage, and export detailed quotations. It supports room-based line items, material tracking with brand-based pricing, and robust PDF generation with comprehensive material specifications. The application aims to streamline the quotation process, providing a tool for accurate, branded, and professional estimates.

## User Preferences

No specific user preferences were provided in the original document.

## System Architecture

### UI/UX Decisions

The application features a luxury aesthetic with a deep green and gold color scheme, Montserrat typography for UI, and Playfair Display for PDF text. Shadcn UI with Tailwind CSS ensures responsive design. Navigation includes top-level tabs and a universal PDF header/footer with branded elements and logo integration.

### Technical Implementations

The frontend uses React with Wouter, TanStack Query, React Hook Form, and Zod for validation. The backend is an Express.js server connected to a PostgreSQL database via Drizzle ORM. Authentication is handled by Replit Auth.

Key features include:
- **Data Validation**: Comprehensive server-side validation using Zod schemas for all input data.
- **Pricing System**: Fully database-driven pricing system managed through Admin Global Rules and Admin Brands panels. Base rates (configurable per build type: handmade/factory) plus brand-specific adjustments (`brands.adderPerSft`) are fetched from database with 1-minute caching. Server-side pricing in `server/lib/pricing.ts` uses async database lookups combining global rules base rates and brand adjustments in a single cached query, with fallback to hardcoded values (handmade: ₹1300, factory: ₹1500) for backward compatibility. Client-side preview in `client/src/lib/rates.ts` uses hardcoded values. Admin Brands panel controls all available brand options in Scope of Work dropdowns via `/api/brands/active` endpoint. Admin Global Rules panel controls base rates, GST, validity, payment schedules, and other application-wide settings. The rates table is no longer used for pricing calculations.
- **Template System**: Database-driven template system (manual creation via admin panel, no seeding). Templates define room items with itemKey, displayName, unit, and wall highlight flags.
- **Painting Pack Integration**: Admin-configured painting packages are integrated into the quotation workflow with BHK-based dynamic pricing (basePriceLsum × (1 + (actualBHK - bhkFactorBase) × perBedroomDelta)). Painting cost is calculated server-side, included in quotation totals, and displayed in the estimate page with package selection UI.
- **PDF Generation**: Dual client-side (html2pdf.js) and server-side (Puppeteer) PDF generation, ensuring consistent branding, detailed room-wise breakdowns, and proper page handling.
- **Agreement Pack**: Consolidated document package with Service Agreement (including all T&C) followed by clean Annexures A (Interiors) and B (False Ceiling) containing only scope and pricing. T&C consolidation uses `excludeTerms=true` query parameter in PDF generation to conditionally hide duplicate T&C from annexures while preserving them in standalone PDF downloads.
- **Quotation Management**: CRUD operations for quotations, including dynamic custom room addition, estimate generation, and print functionalities.
- **Dynamic Terms & Conditions**: Template-based T&C with per-quote overrides and dynamic population of materials and brands. Both Interiors and False Ceiling T&C sections are rendered in the Service Agreement page after the main agreement clauses. Standalone quotation PDFs include their respective T&C sections.
- **Quotation Locking**: Concurrent edit protection system with auto-acquisition, heartbeat mechanism, and UI indicators.
- **Client Portal**: Secure, token-based system for client access and quotation acceptance.
- **Project Management & Expense Tracking**: Workflow for creating and tracking projects, managing expenses, and monitoring profit/loss.
- **Business Expenses Management**: Comprehensive system for tracking overhead expenses with categorization, recurring expense support, and statistical dashboards.
- **Admin Interfaces**: CRUD interfaces for managing templates, brands, painting/FC items, and global rules.
- **Audit Log & Version History**: Comprehensive tracking of all changes, including user, timestamp, and diff viewing for admin actions and detailed versioning for quotations.

## External Dependencies

- **Replit Auth**: User authentication.
- **PostgreSQL (Neon)**: Database.
- **TanStack Query**: Server state management.
- **Wouter**: React router.
- **React Hook Form**: Form management.
- **Zod**: Data validation.
- **Tailwind CSS**: Styling.
- **Shadcn UI**: UI component library.
- **Drizzle ORM**: ORM for PostgreSQL.
- **pdf-lib**: PDF manipulation.
- **html2pdf.js**: Client-side HTML to PDF conversion.
- **JSZip**: ZIP archive creation.