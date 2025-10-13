# TRECASA - Interior Design Quotation Application

## Overview
TRECASA is a professional web application for creating and managing interior design quotations. The application allows users to create detailed quotations with room-based line items, material tracking, and PDF export capabilities.

## Project Information
- **Brand Name**: TRECASA
- **Type**: Interior Design Quotation Tool
- **Stack**: Full-stack JavaScript (React + Express + PostgreSQL)
- **Authentication**: Replit Auth (OpenID Connect)
- **Database**: PostgreSQL (Neon)

## User Flow
1. **Login** - Users authenticate via Replit Auth (supports Google, GitHub, X, Apple, email/password)
2. **Quotes List** - View all quotations in a table format with Quote ID, Project Name, Client Name, Category, Status, Created Date, and Actions
3. **Create Quotation** - Click "New Quotation" to generate a draft with auto-generated Quote ID (format: TRE_QT_YYMMDD_XXXX)
4. **Project Info** - Enter client details and project information
5. **Scope** - Define work scope with two sections:
   - **Interiors**: Room-based line items (Kitchen, Living, Bedrooms, Bathrooms, Utility, Puja) with dimensions (L×H or L×W for SQFT), materials/finishes/hardware (defaults: BWP Ply + Laminate Matte + Nimmi)
   - **False Ceiling**: Room-based area calculations (L×W) with OTHERS section for Paint (Lumpsum), Lights (Count), Fan Hook Rods (Count)
6. **Estimate** - View calculated summaries for interiors and false ceiling
7. **Print** - Print-friendly view with placeholder PDF export buttons

## Features Implemented
- User authentication with Replit Auth
- Quotes List page showing all quotations in table format
- Auto-generated Quote IDs in format: TRE_QT_YYMMDD_XXXX (e.g., TRE_QT_250113_A1B2)
- Project information form with expanded category options (1 BHK, 2 BHK, 3 BHK, 4 BHK, Duplex, Triplex, Villa, Commercial, Other)
- "Other" category with custom text input field
- Scope page with tabs for Interiors and False Ceiling
- Automatic SQFT and area calculations based on dimensions
- Default materials configuration (BWP Ply, Laminate Matte, Nimmi)
- Inline editing for interior and false ceiling items
- Estimate page with separate summaries for interiors and false ceiling
- Print-friendly view with company branding
- Placeholder PDF export buttons (Interiors and False Ceiling PDFs)
- Quote actions: View/Edit and Print from quotes list

## Data Model

### Users
- Managed by Replit Auth
- Stores: id, email, firstName, lastName, profileImageUrl

### Quotations
- Project information: name, category (1 BHK, 2 BHK, 3 BHK, 4 BHK, Duplex, Triplex, Villa, Commercial, Other), client details, address, status
- Belongs to a user
- Has many interior items, false ceiling items, and other items
- Required fields: Project Name, Project Category, Client Name, Client Phone, Project Address
- "Other" category allows custom text input

### Interior Items
- Room type (Kitchen, Living, Bedrooms, Bathrooms, Utility, Puja)
- Dimensions: length, height, width
- Calculated SQFT (L×H or L×W)
- Materials: material, finish, hardware
- Optional pricing fields for future

### False Ceiling Items
- Room type
- Dimensions: length, width
- Calculated area (L×W)
- Optional pricing fields for future

### Other Items
- Item types: Paint, Lights, Fan Hook Rods
- Value type: lumpsum or count
- Flexible value storage

## Architecture

### Frontend (React)
- **Pages**: Landing, Dashboard, Project Info, Scope, Estimate, Print
- **Components**: QuotationHeader (breadcrumb navigation), shadcn UI components
- **State Management**: TanStack Query for server state
- **Routing**: Wouter for client-side routing
- **Forms**: React Hook Form with Zod validation
- **Styling**: Tailwind CSS with custom design tokens

### Backend (Express)
- **Authentication**: Replit Auth with session management
- **Database**: PostgreSQL with Drizzle ORM
- **API Routes**: RESTful endpoints for CRUD operations
- **Storage**: DatabaseStorage implementing IStorage interface

### Design System
- **Colors**: Deep teal primary (15 75% 25%), professional palette
- **Typography**: Inter for UI, JetBrains Mono for data/numbers
- **Components**: Shadcn UI with custom theming
- **Responsive**: Mobile-first with Tailwind breakpoints

## API Endpoints

### Authentication
- GET /api/login - Start login flow
- GET /api/callback - OAuth callback
- GET /api/logout - Logout user
- GET /api/auth/user - Get current user

### Quotations
- GET /api/quotations - List all quotations for user
- GET /api/quotations/:id - Get single quotation
- POST /api/quotations - Create new quotation
- PATCH /api/quotations/:id - Update quotation
- DELETE /api/quotations/:id - Delete quotation

### Interior Items
- GET /api/quotations/:id/interior-items - List items
- POST /api/quotations/:id/interior-items - Create item
- PATCH /api/quotations/:id/interior-items/:itemId - Update item
- DELETE /api/quotations/:id/interior-items/:itemId - Delete item

### False Ceiling Items
- GET /api/quotations/:id/false-ceiling-items - List items
- POST /api/quotations/:id/false-ceiling-items - Create item
- PATCH /api/quotations/:id/false-ceiling-items/:itemId - Update item
- DELETE /api/quotations/:id/false-ceiling-items/:itemId - Delete item

### Other Items
- GET /api/quotations/:id/other-items - List items
- POST /api/quotations/:id/other-items - Create item
- PATCH /api/quotations/:id/other-items/:itemId - Update item
- DELETE /api/quotations/:id/other-items/:itemId - Delete item

## Recent Changes
- Initial setup with complete data schema
- Implemented all frontend pages with exceptional visual design
- Ready for backend implementation and integration

## Next Steps (Future Enhancements)
- Implement actual PDF generation with branded templates
- Add pricing/costing logic with material rates and labor calculations
- Create quotation templates for faster quote generation
- Add quotation versioning and revision history
- Implement quotation sharing via link or email
