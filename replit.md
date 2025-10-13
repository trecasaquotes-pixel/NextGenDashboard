# TRECASA - Interior Design Quotation Application

## Overview
TRECASA is a professional web application designed for interior designers to create, manage, and export detailed quotations. It supports room-based line items, material tracking with brand-based pricing, and PDF generation. The application aims to streamline the quotation process, offering a comprehensive tool for generating accurate and branded estimates for clients.

## User Preferences
No specific user preferences were provided in the original document.

## System Architecture

### UI/UX Decisions
- **Branding**: TRECASA DESIGN STUDIO with a luxury aesthetic.
- **Color Scheme**: Deep green header (#013220), gold accents (#C9A4E), red dot (#C62828) as a brand accent, and a deep teal primary color.
- **Typography**: Inter for UI elements and JetBrains Mono for data and numbers.
- **Components**: Shadcn UI with custom theming, ensuring responsiveness with Tailwind CSS breakpoints.
- **Header/Footer**: Consistent branding with "TRECASA DESIGN STUDIO 🔴" and tagline "Luxury Interiors | Architecture | Build", and a footer with copyright, contact, and social links.

### Technical Implementations
- **Frontend**: React application utilizing Wouter for routing, TanStack Query for server state management, and React Hook Form with Zod for form validation.
- **Backend**: Express.js server handling API requests and business logic.
- **Database**: PostgreSQL, managed with Drizzle ORM for data persistence.
- **Authentication**: Replit Auth (OpenID Connect) for secure user login.
- **Smart Rate Calculator**: Incorporates brand-based pricing for materials, finishes, and hardware, with real-time calculation updates based on dimensions and selections.
- **Totals Calculation System**: Real-time computation and persistence of subtotals (interiors, false ceiling, grand), discount, and GST.
- **Template System**: Enables auto-creation of room items based on project categories using predefined templates, with options to customize or skip.

### Feature Specifications
- **Quotation Management**: Create, view, edit, and manage quotations with unique auto-generated IDs (TRE_QT_YYMMDD_XXXX).
- **Project Information**: Capture client details, project category (e.g., 1 BHK, Commercial), and address.
- **Scope Definition**:
    - **Interiors**: Room-based line items with dimensions, material/finish/hardware selections, and automatic SQFT calculation.
    - **False Ceiling**: Room-based area calculations with specific items like Paint, Lights, and Fan Hook Rods.
- **Estimate Generation**: Detailed summaries for interiors and false ceiling, overall summary with discount application (percentage or amount), and fixed 18% GST calculation, leading to a final quote amount.
- **Print Functionality**: Print-friendly view with company branding and placeholders for future PDF export.
- **Quotes List**: Tabular display of quotations including project details, status (draft, sent, accepted, rejected), and financial totals with color-coded badges for status.

## External Dependencies
- **Replit Auth**: For user authentication and authorization.
- **PostgreSQL (Neon)**: The primary database for storing application data.
- **TanStack Query**: For managing and caching server state in the frontend.
- **Wouter**: A minimalist React router for client-side navigation.
- **React Hook Form & Zod**: For form management and validation.
- **Tailwind CSS**: For utility-first styling and responsive design.
- **Shadcn UI**: A collection of re-usable UI components.
- **Drizzle ORM**: An ORM for interacting with the PostgreSQL database.
- ✅ **Scope UX Enhancements COMPLETE** (Architect Approved): Inline room totals and sticky footer bars
  - **Inline Room Total Badges**:
    - Interiors rooms: Display "Room Total: ₹X" badge when roomTotal > 0
    - False Ceiling rooms: Display "Room Area: X SQFT" badge when totalArea > 0
    - Right-aligned badges using Shadcn Badge component with secondary variant
    - All monetary values formatted with formatINR()
    - Conditional rendering prevents showing ₹0.00 badges for empty rooms
  - **Sticky Footer Bars per Tab**:
    - Interiors tab: Fixed bottom footer showing "Interiors Subtotal: ₹X" with "Next → Estimate" button
    - False Ceiling tab: Fixed bottom footer showing "False Ceiling Subtotal: ₹X" with "Next → Estimate" button
    - Both footers read from quotation.totals (interiorsSubtotal/fcSubtotal)
    - Proper z-index and shadow for visual hierarchy
    - TabsContent has pb-24 padding to prevent content overlap with sticky footer
  - **Data Attributes**:
    - Room total badges: `badge-room-total-{roomType}` (Interiors)
    - FC area badges: `badge-fc-room-area-{roomType}` (False Ceiling)
    - Subtotal displays: `text-interiors-subtotal`, `text-fc-subtotal`
    - Navigation buttons: `button-next-estimate-interiors`, `button-next-estimate-fc`
  - **UX Improvements**:
    - Real-time visibility of room-level totals without scrolling to footer
    - Persistent access to subtotals and navigation while working on items
    - Visual separation between room groups with inline financial feedback
  - **Testing Status**: ✅ Architect verified implementation, conditional rendering, layout, and formatting

- ✅ **Dimension Input Enhancements COMPLETE** (Architect Approved): Enhanced L/H/W inputs with improved sizing and validation
  - **CSS Styling** (`.dimInput` class in index.css):
    - Width: 130px desktop (96px mobile)
    - Height: 40px desktop (38px mobile)
    - Font-size: 15px with padding 8px 10px
    - Border-radius: 8px for modern appearance
    - Spinner arrows removed via CSS for cleaner UI
  - **Input Behavior**:
    - Type: text (not number) with inputMode="decimal" for better mobile keyboards
    - Pattern: `^\d*(\.\d{0,2})?$` for validation
    - Placeholder: "0.00" to indicate expected format
    - onWheel: Prevents accidental mouse-wheel changes by blurring
    - onKeyDown: Blocks ArrowUp/ArrowDown to prevent unintended increments
  - **Sanitization Logic** (`sanitizeDecimalInput` function):
    - Removes all non-numeric characters except decimal point
    - Ensures only ONE decimal point (keeps first, removes rest)
    - Clamps fractional part to exactly 2 decimal places
    - Edge cases handled: "1.2.345"→"1.23", ".99."→".99", "12..45"→"12.45", "abc12.3x45"→"12.34"
  - **Column Width Adjustments**:
    - L/H/W columns: w-[140px] (increased from 70px/120px)
    - SQFT/Area column: w-[90px] (fixed width for bold text)
    - Table allows horizontal scroll if content overflows
  - **Applied To**:
    - Interiors tab: Length, Height, Width inputs for all room items
    - False Ceiling tab: Length, Width inputs for all ceiling items
  - **Testing Status**: ✅ Architect verified sanitization logic handles all edge cases correctly, CSS implementation follows best practices

- ✅ **Dynamic Terms & Conditions COMPLETE** (Architect Approved): Template-based T&C system with per-quote overrides
  - **Terms Library** (client/src/lib/terms.ts):
    - Default templates for Interiors and False Ceiling with token placeholders
    - renderTerms() function for token substitution: {validDays}, {warrantyMonths}, {paymentSchedule}, {clientName}, {projectName}, {quoteId}
    - Default configuration: 15 days validity, 12 months warranty, "50% booking, 40% mid, 10% handover" payment schedule
  - **Data Model**:
    - Added terms JSONB field to quotations table with interiors/falseCeiling structure
    - Each section has: useDefault boolean, templateId, customText (newline-separated), vars object
    - Automatically initialized with default terms when creating new quotations
  - **UI Component** (TermsEditor):
    - Tabs for Interiors Terms and False Ceiling Terms
    - Toggle: "Use default template" vs. custom text
    - Default mode: inputs for validDays, warrantyMonths, paymentSchedule with live preview
    - Custom mode: textarea for custom terms (one per line) with live preview
    - Save button updates quotation via PATCH API with cache invalidation
    - Preview shows rendered terms with token substitution
  - **Integration**:
    - TermsEditor added to Estimate page below Overall Summary card
    - Print page uses dynamic terms via renderTerms() for both Interiors and False Ceiling PDFs
    - "Edit Terms & Conditions" button on Print page navigates to Estimate page
  - **Data Attributes**:
    - Terms editor card: `card-terms-editor`
    - Tab triggers: `tab-interiors-terms`, `tab-fc-terms`
    - Toggle switches: `switch-interiors-use-default`, `switch-fc-use-default`
    - Variable inputs: `input-interiors-valid-days`, `input-interiors-warranty`, `input-interiors-payment`
    - Custom textareas: `textarea-interiors-custom`, `textarea-fc-custom`
    - Save button: `button-save-terms`
    - Edit button on Print: `button-edit-terms`
  - **Testing Status**: ✅ Architect verified data model consistency, token substitution correctness, UI/UX flow, and preview accuracy

- ✅ **Signature Block & Status Controls COMPLETE** (Architect Approved): Client and Trecasa signature system with status tracking
  - **Data Model**:
    - Added signoff JSONB field to quotations table with client/trecasa structure
    - Client section: name, typed signature, signedAt timestamp
    - Trecasa section: name, title, typed signature, signedAt timestamp
    - Acceptance tracking: accepted boolean, acceptedAt timestamp
    - Automatically initialized with default values when creating quotations
  - **Date Formatting** (client/src/lib/utils.ts):
    - dateFormat() helper function formats timestamps as "13 Oct 2025, 5:42 PM"
    - Used consistently across all date displays
  - **SignoffEditor Component** (client/src/components/signoff-editor.tsx):
    - Two-column layout: Client (left) and Trecasa (right)
    - Client section: name input (pre-filled from clientName), typed signature input, "Mark Client Accepted" button
    - Trecasa section: signatory name input (default "Authorized Signatory"), title input (default "For TRECASA DESIGN STUDIO"), typed signature input, "Mark Trecasa Signed" button
    - All fields persist immediately on blur with proper cache invalidation
    - Buttons disabled after action, replaced with green/gray badges showing formatted dates
    - Single atomic mutation for acceptance to prevent stale state overwrites
  - **Estimate Page Integration**:
    - SignoffEditor added below TermsEditor in "Sign & Status" panel
    - Displays current acceptance and signature status
    - Real-time updates with mutation feedback
  - **Print Page Signatures**:
    - Signature blocks added to both Interiors and False Ceiling PDFs below Terms & Conditions
    - Two-column layout with break-inside-avoid for proper page breaks
    - Client column: Shows name, typed signature (italic serif font), signed date
    - Trecasa column: Shows title, name, typed signature, signed date
    - Fallback to "_____________" placeholders when fields empty
    - Professional formatting with small-caps labels and regular values
  - **Status Shortcuts** (Print page header):
    - Status badge with color coding: gray (draft), blue (sent), green (accepted), red (rejected)
    - "Mark as Sent" button: updates status to "sent"
    - "Mark as Accepted" button: updates status to "accepted" AND sets signoff.accepted=true, acceptedAt=timestamp
    - Buttons conditionally shown based on current status
    - Mutations show toast notifications and invalidate cache
  - **Data Attributes**:
    - SignoffEditor: `card-signoff-editor`, `input-client-name`, `input-client-signature`, `button-mark-client-accepted`, `badge-client-accepted`, `input-trecasa-name`, `input-trecasa-title`, `input-trecasa-signature`, `button-mark-trecasa-signed`, `badge-trecasa-signed`
    - Print signatures: `signature-block-interiors`, `signature-block-false-ceiling`
    - Status controls: `badge-quote-status`, `button-mark-as-sent`, `button-mark-as-accepted`
  - **Testing Status**: ✅ Architect verified data model, atomic mutations prevent stale overwrites, signature rendering in PDFs, status badge logic, date formatting consistency
