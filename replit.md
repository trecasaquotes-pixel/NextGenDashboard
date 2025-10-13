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
6. **Estimate** - View calculated summaries with room breakdowns and placeholder pricing (Subtotal, Discount 0%, GST 18%, Final Quote all showing ₹0.00)
7. **Print** - PDF export page with two preview panels (Interiors and False Ceiling) showing TRECASA branding placeholders and disabled download buttons

## Features Implemented
- User authentication with Replit Auth
- Quotes List page showing all quotations in table format
- Auto-generated Quote IDs in format: TRE_QT_YYMMDD_XXXX (e.g., TRE_QT_250113_A1B2)
- Project information form with expanded category options (1 BHK, 2 BHK, 3 BHK, 4 BHK, Duplex, Triplex, Villa, Commercial, Other)
- "Other" category with custom text input field
- Scope page with tabs for Interiors and False Ceiling
- Automatic SQFT and area calculations based on dimensions
- **Smart Rate Calculator** with brand-based pricing
  - Build Type selection: Work-on-Site (₹1300/sqft) or Factory Finish (₹1500/sqft)
  - Core Material brands with price adjustments: Generic Ply, Century Ply, Green Ply, Kitply, HDHMR, BWP, MDF, HDF
  - Finish Material brands with price adjustments: Generic Laminate, Greenlam, Merino, Century Laminate, Duco, PU, Acrylic, Fluted Panel, Back Painted Glass, CNC Finish, Veneer
  - Hardware brands with price adjustments: Nimmi, Ebco, Hettich, Hafele, Sleek, Blum
  - Auto-calculation: Rate = Base Rate + Material Adjustments, Amount = Rate × SQFT
  - Live updates when dimensions or brand selections change
- Default materials configuration (Generic Ply, Generic Laminate, Nimmi for Work-on-Site)
- Inline editing for interior and false ceiling items with real-time calculations
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
- **Branding**: TRECASA DESIGN STUDIO with luxury aesthetic
- **Colors**: 
  - Deep green header (#013220)
  - Gold accents (#C9A74E) for tagline and borders
  - Red dot (#C62828) as brand accent
  - Deep teal primary (15 75% 25%), professional palette
- **Typography**: Inter for UI, JetBrains Mono for data/numbers
- **Components**: Shadcn UI with custom theming
- **Responsive**: Mobile-first with Tailwind breakpoints
- **Header**: "TRECASA DESIGN STUDIO 🔴" with tagline "Luxury Interiors | Architecture | Build"
- **Footer**: Copyright, contact info, and social links with gold top border

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

## Recent Changes (January 13, 2025)
- ✅ **Week 1 Milestone Complete**: Full quotation flow working end-to-end
- ✅ **Branding Update Complete**: Official TRECASA identity applied across entire application
  - New AppHeader with deep green background (#013220), "TRECASA DESIGN STUDIO 🔴", gold tagline (#C9A74E)
  - New AppFooter with gold top border, copyright, contact info, and social links
  - All pages updated: Landing, Dashboard, Quotes List, Project Info, Scope, Estimate, Print
  - QuotationHeader simplified to work with new branding
  - Consistent luxury aesthetic throughout the application
- ✅ **Smart Rate Calculator Implemented**: Brand-based pricing with auto-calculation
  - Created lib/rates.ts with base rates (Work-on-Site: ₹1300/sqft, Factory Finish: ₹1500/sqft) and brand adjustment tables
  - Updated schema to include buildType field for interior items
  - Converted material/finish/hardware inputs to dropdowns with brand options (Generic Ply, Century Ply, Greenlam, Merino, Hettich, Hafele, etc.)
  - Implemented auto-calculation logic: Rate = Base Rate + Material Adjustments, Amount = Rate × SQFT
  - Fixed critical bug where SQFT and pricing weren't recalculating when dimensions changed
  - Fixed data type bug where unitPrice and totalPrice were being sent as strings instead of numbers
  - Rate and Amount columns now display live calculations (₹/sft and ₹) on the Scope page
- Implemented Estimate page with two summary cards (Interiors and False Ceiling) showing:
  - Room-based breakdowns with SQFT/Area totals
  - Placeholder pricing: Subtotal ₹0.00, Discount 0%, GST (18%) ₹0.00, Final Quote ₹0.00
  - Navigation: Back to Scope + Continue to Print
- Implemented Print page with two PDF preview panels showing:
  - TRECASA branding placeholders in preview boxes
  - Disabled download buttons (Interiors PDF and False Ceiling PDF)
  - Navigation: Back to Estimate
- Full navigation flow tested: Login → Quotes List → Create → Project Info → Scope → Estimate → Print
- All data persistence working with PostgreSQL database

## Next Steps (Future Enhancements)
- Implement actual PDF generation with branded templates
- Add pricing/costing logic with material rates and labor calculations
- Create quotation templates for faster quote generation
- Add quotation versioning and revision history
- Implement quotation sharing via link or email
