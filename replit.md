# TRECASA - Interior Design Quotation Application

## Overview
TRECASA is a professional web application for interior designers to create, manage, and export detailed quotations. It supports room-based line items, material tracking with brand-based pricing, and PDF generation. The application aims to streamline the quotation process, offering a comprehensive tool for generating accurate and branded estimates.

## User Preferences
No specific user preferences were provided in the original document.

## System Architecture

### UI/UX Decisions
- **Branding**: TRECASA DESIGN STUDIO with a luxury aesthetic (no emojis).
- **Color Scheme**: Deep green header, gold accents, red dot for branding, and deep teal primary color.
- **Typography**: Inter for UI elements and JetBrains Mono for data.
- **Components**: Shadcn UI with custom theming and Tailwind CSS for responsiveness.
- **Header/Footer**: Consistent branding with "TRECASA DESIGN STUDIO", tagline "Luxury Interiors | Architecture | Build", and a footer with copyright and contact information.

### Technical Implementations
- **Frontend**: React with Wouter for routing, TanStack Query for server state, and React Hook Form with Zod for validation.
- **Backend**: Express.js server.
- **Database**: PostgreSQL with Drizzle ORM.
- **Authentication**: Replit Auth (OpenID Connect) for user sessions, HMAC-SHA256 render tokens for server-side PDF generation.
- **Smart Rate Calculator**: Incorporates brand-based pricing for real-time calculation updates.
- **Totals Calculation System**: Real-time computation of subtotals, discounts, and GST.
- **Template System**: Auto-creation of room items based on project categories using predefined templates.
- **Server-Side PDF Generation**: Puppeteer-based PDF rendering with authentication via time-limited, quotation-specific render tokens.
- **Render Token System**: HMAC-signed tokens (5-minute expiry) enable Puppeteer to access protected pages without user sessions. Set RENDER_SECRET environment variable in production.

### Feature Specifications
- **Quotation Management**: Create, view, edit, and manage quotations with unique auto-generated IDs (TRE_QT_YYMMDD_XXXX).
- **Project Information**: Capture client details, project category (e.g., 1 BHK, Commercial), and address.
- **Scope Definition**: Room-based line items for Interiors (dimensions, materials) and False Ceiling (area calculations, specific items).
- **Estimate Generation**: Detailed summaries for interiors and false ceiling, overall summary with discount and 18% GST calculation.
- **Print Functionality**: Print-friendly view with company branding and PDF export capabilities.
- **Quotes List**: Tabular display of quotations with project details, status, and financial totals.
- **UX Enhancements**: Inline room totals and sticky footer bars for better navigation and real-time feedback.
- **Dimension Input Enhancements**: Improved input fields for Length, Height, Width with enhanced styling, validation, and sanitization.
- **Dynamic Terms & Conditions**: Template-based T&C system with per-quote overrides and token substitution.
- **Signature Block & Status Controls**: Client and Trecasa signature system with typed signatures, timestamps, and status tracking (draft, sent, accepted, rejected).
- **Agreement Pack — PDF Merging**: Functionality to merge the service agreement, annexure title pages, and quotation PDFs into a single downloadable document.
- **Backup & Export System**: ZIP file generation for individual quotations (includes PDFs for Interiors, False Ceiling, Agreement, plus JSON data) and global data export (all quotations with JSON metadata). Accessible via Print page and Quotes list page.
- **Admin → Rates Management**: Comprehensive administrative interface for managing pricing rates with PostgreSQL persistence. Features include:
  - 59 default rates seeded on first launch (Kitchen, Living, Dining, Bedrooms, Others, FC categories)
  - Full CRUD operations with soft deletes (isActive flag)
  - Advanced filtering: search by name/key, filter by category, unit, and active status
  - Inline editing: handmade/factory rates (with debounce), category dropdown, active toggle
  - Add/Edit modal with form validation and duplicate functionality
  - Unit guardrails: FC items locked to LSUM/COUNT, Others items locked to LSUM (enforced both frontend and backend)
  - Brand-based pricing: separate handmade and factory rates for material/finish/hardware brands
  - Accessible via user dropdown menu → "Admin - Rates"

## External Dependencies
- **Replit Auth**: User authentication and authorization.
- **PostgreSQL (Neon)**: Primary database.
- **TanStack Query**: Server state management.
- **Wouter**: React router.
- **React Hook Form & Zod**: Form management and validation.
- **Tailwind CSS**: Styling and responsive design.
- **Shadcn UI**: Re-usable UI components.
- **Drizzle ORM**: ORM for PostgreSQL.
- **pdf-lib**: For PDF manipulation (merging).
- **html2pdf.js**: For converting HTML to PDF.
- **JSZip**: For creating ZIP archives containing quotation backups.