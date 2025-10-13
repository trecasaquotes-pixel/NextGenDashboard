# TRECASA - Interior Design Quotation Application

### Overview
TRECASA is a professional web application designed for interior designers to create, manage, and export detailed quotations. It supports room-based line items, material tracking, and generates professional PDF documents. The application aims to streamline the quotation process, allowing designers to efficiently manage project information, define scope with precise measurements and material selections, and provide transparent estimates to clients.

### User Preferences
I prefer simple language and detailed explanations. I want iterative development with frequent, small updates. Ask before making major changes. Do not make changes to the folder `Z` or the file `Y`.

### System Architecture

**UI/UX Decisions:**
The application features a luxury aesthetic with "TRECASA DESIGN STUDIO 🔴" branding, using a deep green header (`#013220`), gold accents (`#C9A74E`), and a red dot (`#C62828`) as a brand accent. Typography uses Inter for UI and JetBrains Mono for data. Shadcn UI components are used with custom theming for a professional and responsive design.

**Technical Implementations:**
-   **Frontend**: React for the user interface, utilizing Wouter for client-side routing, React Hook Form with Zod for form management and validation, and TanStack Query for server state management. Styling is handled with Tailwind CSS.
-   **Backend**: Express.js powers the backend, managing API routes and integrating with Replit Auth for user authentication and session management.
-   **Database**: PostgreSQL is used for data persistence, with Drizzle ORM facilitating interaction.
-   **Authentication**: Replit Auth provides secure user authentication supporting various providers.
-   **Smart Rate Calculator**: Implemented with brand-based pricing logic, allowing selection of build type (Work-on-Site, Factory Finish), core materials, finish materials, and hardware brands, dynamically adjusting rates and total amounts.
-   **Templates System**: Predefined room configurations based on project categories (e.g., 1-4 BHK, Villa, Commercial) can be applied to quickly populate quotation scope.
-   **Financial Calculations**: Real-time calculation of subtotals, discounts (percentage or amount), and 18% GST, culminating in a final quote amount displayed on the estimate page.

**Feature Specifications:**
-   **Quotes Management**: Users can create, view, edit, and print quotations.
-   **Auto-generated Quote IDs**: Unique IDs in the format `TRE_QT_YYMMDD_XXXX`.
-   **Project Information**: Comprehensive forms for client and project details, including an "Other" category for custom project types.
-   **Scope Definition**:
    -   **Interiors**: Room-based line items with dimensions, material, finish, and hardware selections.
    -   **False Ceiling**: Room-based area calculations.
    -   **Others**: Lumpsum or count-based items like Paint, Lights, and Fan Hook Rods.
-   **Estimate View**: Detailed summaries for interiors, false ceiling, and overall project, including discount and GST calculations.
-   **Print Functionality**: Placeholder for PDF export, displaying company branding.

**System Design Choices:**
The system is designed as a full-stack JavaScript application, prioritizing a modular component-based architecture on the frontend and a RESTful API design on the backend. Data models are structured to support detailed quotation components, including `Quotations`, `Interior Items`, `False Ceiling Items`, and `Other Items`, all linked to authenticated `Users`.

### External Dependencies
-   **Authentication**: Replit Auth (OpenID Connect)
-   **Database**: PostgreSQL (Neon)
-   **Frontend Libraries**: React, Wouter, React Hook Form, Zod, TanStack Query, shadcn UI, Tailwind CSS
-   **Backend Libraries**: Express.js, Drizzle ORM