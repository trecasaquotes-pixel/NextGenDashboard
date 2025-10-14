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
- **PDF Generation System**: Dual-approach PDF generation with client-side and server-side options:
  - **Client-Side PDF**: Primary implementation using html2pdf.js for browser-based PDF generation (htmlToPdfBytes/downloadBytesAs)
  - **Server-Side PDF**: Puppeteer-based rendering with Google Fonts (Playfair Display, Montserrat), professional margins (A4: 25mm top, 18mm bottom, 15mm sides), header/footer templates with page numbering
  - **Professional Typography**: Playfair Display (serif) for headings, Montserrat (sans-serif) for body text
  - **Room Summary Tables**: Dedicated summary page (page 1) showing room-wise totals before detailed breakdowns
  - **Page Break System**: Proper pagination with .page-break, .page-break-before, .break-inside-avoid classes
  - **Loading States**: User feedback with toast notifications and button states during PDF generation
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
- **Admin → Templates Management**: Full-featured template system for creating quotation templates with PostgreSQL persistence. Features include:
  - Default "Residential 3BHK - Standard" template seeded on first launch with 9 rooms and 48 items
  - Full CRUD operations for templates, rooms, and items (soft deletes with isActive flag for templates)
  - Advanced filtering: search by name, filter by category (Residential 1BHK/2BHK/3BHK, Villa, Commercial), active status
  - Template list view with actions: Edit, Duplicate, Export JSON, Delete
  - Template editor with hierarchical structure: template details → rooms → items
  - Inline editing: template name/category/status, room names/sort order, item keys/display names/units
  - Import/Export JSON functionality for template backup and sharing
  - Accordion-based UI for managing rooms and items with drag-and-drop sorting capability
  - Template validation: ensures itemKey references exist in rates table
  - Accessible via user dropdown menu → "Admin - Templates"
- **Admin → Brands & Add-ons**: Comprehensive brand management system for pricing adders with PostgreSQL persistence. Features include:
  - 12 default brands seeded on first launch: Core (Generic Ply, Century Ply, Greenply), Finish (Generic Laminate, Merino, Greenlam, Acrylic), Hardware (Generic, Hettich, Häfele, Ebco, Sleek)
  - Full CRUD operations with soft deletes (isActive flag)
  - Tab-based interface for Core, Finish, and Hardware brand categories
  - Inline editing: brand name and adder per SFT (₹) with debounced updates
  - Default brand management: only one default per type (radio-like behavior), enforced server-side
  - Guardrails: unique names per type (case-insensitive), cannot deactivate/delete default brands, must set another default first
  - Search filter for quick brand lookup (client-side)
  - Special handling: Acrylic finish displays "+₹200/sft (special)" badge in UI
  - Brand adders integrated into pricing calculations: base rate + core adder + finish adder + hardware adder
  - Accessible via user dropdown menu → "Admin - Brands & Add-ons"
- **Admin → Painting & FC**: Administrative system for managing painting packages with BHK-based scaling and FC catalog items with PostgreSQL persistence. Features include:
  - 5 default painting packs seeded on first launch: Tractor Emulsion (₹35k), Premium (₹50k), Royal Luxury Emulsion (₹80k), Royal Shine (₹90k), Royal Aspira (₹100k)
  - 4 default FC catalog items: FC Paint (LSUM), FC Lights (COUNT), Fan Hook Rods (COUNT), Cove LED Strip (COUNT)
  - Full CRUD operations for both painting packs and FC catalog with soft deletes (isActive flag)
  - Tab-based interface for Painting Packs and FC Catalog
  - BHK-based pricing scaling: price = basePriceLsum × (1 + (targetBHK - bhkFactorBase) × perBedroomDelta)
  - Real-time price preview for 1/2/3/4 BHK on each painting pack card
  - Inline editing: pack name, base price, BHK baseline, delta, bullets, show in quote toggle, active toggle (with debounce)
  - FC catalog inline editing: display name, unit (locked for reserved keys), default value, rate per unit, active toggle
  - Guardrails: reserved FC keys (fc_paint, fc_lights, fc_fan_hook, fc_cove_led) have locked units enforced server-side
  - Add/Edit/Duplicate/Delete functionality for painting packs
  - Add/Edit/Delete functionality for FC catalog items
  - Search filters for both tabs
  - Bullet points editor for painting pack features (one per line in textarea)
  - Accessible via user dropdown menu → "Admin - Painting & FC"
- **Admin → Global Rules**: Single-row configuration system for application-wide settings with PostgreSQL persistence. Features include:
  - Single-row configuration (id="global") seeded on first launch with TRECASA defaults
  - Five configuration sections: Pricing Defaults, Bedroom Scaling, Payment Schedule, City Factors, Footer Branding
  - Pricing Defaults: buildTypeDefault (handmade/factory), gstPercent (0-28%), validityDays (1-90)
  - Bedroom Scaling: bedroomFactorBase (1-5 BHK baseline), perBedroomDelta (0-0.25 per-bedroom multiplier)
  - Real-time BHK price preview: price = base × (1 + (targetBHK - bedroomFactorBase) × perBedroomDelta)
  - Payment Schedule: editable JSON array of {label, percent} with validation (must sum to 100%)
  - Progress bar visualization and "Reset to Default" functionality for payment schedule
  - City Factors: editable JSON array of {city, factor} with range validation (0.8-1.3)
  - Footer Branding: two-line PDF footer configuration with live preview (includes red dot separator)
  - Server-side validation: payment schedule total enforcement, city factor range checks, GST/validity bounds
  - Upsert API pattern: PUT creates or updates single global configuration row
  - Client-side validation: Save button disabled when payment schedule ≠ 100% or values out of range
  - Add/delete functionality for payment schedule items and city factors
  - Persistence verification: all values reload correctly after page refresh
  - Accessible via user dropdown menu → "Admin - Global Rules"
- **Admin → Audit Log**: Comprehensive audit trail system tracking all changes across admin sections with PostgreSQL persistence. Features include:
  - Complete change history for all admin sections: Rates, Templates, Brands, Painting & FC, Global Rules
  - Automatic logging on CREATE/UPDATE/DELETE operations with user tracking (userId, userEmail)
  - Structured audit entries: section, action (CREATE|UPDATE|DELETE), targetId, human-readable summary, beforeJson, afterJson
  - Smart summary generation: context-aware descriptions of what changed (e.g., "Updated rate X: handmade ₹1300→1400")
  - Advanced filtering: search by summary/user email, filter by section, filter by action, date range (since/until)
  - Pagination: 50/100/200 entries per page with Previous/Next navigation
  - Diff viewer modal: side-by-side Before/After JSON comparison with syntax highlighting
  - Copy to clipboard: individual copy buttons for Before and After JSON states
  - Real-time updates: audit entries appear immediately after admin actions
  - User attribution: tracks authenticated user performing each action
  - Soft delete tracking: logs deactivation operations with before/after states
  - API endpoints: GET /api/admin/audit (list with filters), GET /api/admin/audit/:id (single entry with full JSON)
  - Server-side auth enforcement: all audit routes require authenticated session
  - Accessible via user dropdown menu → "Admin - Audit Log"
- **Client Portal — Secure Quote Sharing**: Token-based system for sharing quotations with clients without requiring authentication. Features include:
  - Secure token generation with optional 14-day expiry (cryptographically random, validated on each request)
  - Share Link Dialog in Estimate page: generate, regenerate, copy, and open client portal links
  - Public Client Portal page accessible at /client/:quoteId?token=... with no authentication required
  - Client view displays: project info, financial summary with discount/GST, terms & conditions, PDF download buttons
  - Client acceptance flow: typed name signature (no signature image), quote approval, agreement generation
  - Dual PDF authentication: supports both user sessions and render tokens for secure document access
  - Real-time query invalidation ensures admin UI updates immediately after link generation
  - Audit logging: tracks link generation/regeneration and client acceptance with full before/after states
  - Database schema: clientToken and clientTokenExpiresAt fields in quotations table
  - Token utilities: server/lib/client-token.ts with generation, verification, and expiry validation
  - API endpoints: GET /api/client-quote/:id/info, POST /api/client-quote/:id/accept, POST /api/client-quote/:id/request-link
  - Error handling: expired tokens, invalid links, missing quotes with user-friendly messages
  - Accessible via "Share with Client" button on Estimate page

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