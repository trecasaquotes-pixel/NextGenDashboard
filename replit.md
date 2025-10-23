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
- **Pricing System**: Smart Rate Calculator with brand-based pricing and project-level "Build Type" for real-time cost adjustments.
- **Template System**: Auto-creation of room items based on 4 predefined templates (Modern 1BHK, 2BHK, 3BHK, Commercial) with backward compatibility for legacy quotations.
- **PDF Generation**: Dual client-side (html2pdf.js) and server-side (Puppeteer) PDF generation, ensuring consistent branding, detailed room-wise breakdowns, and proper page handling.
- **Agreement Pack**: Functionality to merge multiple PDFs, customize agreement details (materials, specs, payment schedules), and dynamically include annexures.
- **Quotation Management**: CRUD operations for quotations, including dynamic custom room addition, estimate generation, and print functionalities.
- **Dynamic Terms & Conditions**: Template-based T&C with per-quote overrides and dynamic population of materials and brands.
- **Quotation Locking**: Concurrent edit protection system with auto-acquisition, heartbeat mechanism, and UI indicators.
- **Client Portal**: Secure, token-based system for client access and quotation acceptance.
- **Project Management & Expense Tracking**: Workflow for creating and tracking projects, managing expenses, and monitoring profit/loss.
- **Business Expenses Management**: Comprehensive system for tracking overhead expenses with categorization, recurring expense support, and statistical dashboards.
- **Admin Interfaces**: CRUD interfaces for managing rates, templates, brands, painting/FC items, and global rules.
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