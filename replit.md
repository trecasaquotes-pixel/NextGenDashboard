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