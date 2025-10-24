# TRECASA Interior Quotation App - Design Guidelines

## Design Approach

**System-Based Approach** - This utility-focused quotation tool requires clarity, efficiency, and professional polish. Drawing inspiration from modern SaaS applications like Linear and Notion, with clean forms and data-focused layouts that prioritize usability over decoration.

## Core Design Elements

### A. Red Dot Theory - Brand Identity System

**Concept:** The red dot (#E50914) is TRECASA's signature visual mark, representing precision, focus, and identity. It appears strategically throughout the application as a minimal, recognizable brand element.

**Implementation Rules:**

1. **Placement:**
   - After "TRECASA DESIGN STUDIO" branding (in headers, PDFs, footers)
   - On primary action buttons (Download Agreement Pack, Create Quotation, etc.)
   - At completion states (Quote Ready, Saved Successfully)
   - **One dot per section/screen** - never overuse

2. **Visual Specifications:**
   - Color: #E50914 (signature red)
   - Shape: Perfect circle
   - Size: Small (8px), Medium (10px), Large (12px) depending on context
   - Spacing: 0.4em gap from adjacent text
   - Animation: 0.3s fade-in with ease-in timing (optional for static contexts)
   - Opacity: 100% (always solid)

3. **Component Usage:**
   - Use the `<RedDot />` component from `@/components/ui/red-dot`
   - Props: `size="sm|md|lg"`, `animated={true|false}`, `className`
   - Example: `<h1>TRECASA DESIGN STUDIO<RedDot size="md" /></h1>`

4. **Application:**
   - App headers and navigation
   - PDF document headers and footers
   - Primary CTAs and action buttons
   - Completion indicators and success states
   - Email signatures (when implemented)

### B. Color Palette

**Light Mode:**

- Primary: 15 75% 25% (Deep teal - professional, trustworthy)
- Background: 0 0% 98% (Soft white)
- Surface: 0 0% 100% (Pure white for cards)
- Text Primary: 220 15% 15% (Near black)
- Text Secondary: 220 10% 45% (Medium gray)
- Border: 220 13% 88% (Light gray)
- Success: 142 76% 36% (Green for confirmations)
- Warning: 38 92% 50% (Amber for alerts)

**Dark Mode:**

- Primary: 15 75% 45% (Lighter teal for contrast)
- Background: 220 15% 8% (Deep charcoal)
- Surface: 220 15% 12% (Elevated charcoal)
- Text Primary: 0 0% 95% (Off-white)
- Text Secondary: 220 10% 65% (Light gray)
- Border: 220 15% 20% (Subtle border)

**Gold Integration:** Reserve space for gold (45 90% 55%) logo and subtle accent touches without overwhelming the professional aesthetic.

### B. Typography

**Font Stack:**

- Primary: 'Montserrat', system-ui, sans-serif (via Google Fonts)
  - Used for all UI elements, body text, labels, buttons, forms
  - Also used for numbers, dimensions, calculations, and tabular data
- Secondary: 'Playfair Display', Georgia, serif (via Google Fonts)
  - Used for headings, section titles, and elegant accents

**Scale:**

- Headings: font-bold text-2xl to text-4xl (Playfair Display)
- Body: font-normal text-base (Montserrat)
- Labels: font-medium text-sm (Montserrat)
- Captions: font-normal text-xs (Montserrat)
- Data/Numbers: font-mono text-sm (Montserrat - for dimensions, SQFT, prices)

### C. Layout System

**Spacing Primitives:** Use Tailwind units of 2, 4, 6, 8, 12, 16 for consistent rhythm

- Component padding: p-4, p-6, p-8
- Section spacing: space-y-6, space-y-8
- Form gaps: gap-4, gap-6
- Card spacing: p-6 to p-8

**Container Structure:**

- Max widths: max-w-7xl for dashboards, max-w-4xl for forms
- Responsive breakpoints: Mobile-first with md: and lg: modifiers

### D. Component Library

**Navigation:**

- Top navbar: Fixed, glass-morphism effect (backdrop-blur-md bg-white/80 dark:bg-gray-900/80)
- Logo placement: Left-aligned with TRECASA wordmark
- User menu: Right-aligned dropdown with avatar
- Active states: Subtle teal underline or background

**Dashboard:**

- Quotation cards: Grid layout (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- Card design: Rounded-lg shadow-sm hover:shadow-md transition
- Card content: Project name (bold), client, date, status badge, quick actions
- Empty state: Centered illustration placeholder with "Create First Quote" CTA

**Forms (Project Info, Scope):**

- Input fields: Rounded-md border with focus:ring-2 focus:ring-primary
- Labels: Above inputs, font-medium text-sm
- Field groups: Organized in 2-column grid on desktop (grid-cols-1 md:grid-cols-2)
- Validation: Inline error messages in red, success states in green
- Dark mode: Consistent background colors for all inputs (bg-gray-800 dark mode)

**Data Tables (Scope, Estimate):**

- Header: Sticky, bg-gray-50 dark:bg-gray-800, font-semibold
- Rows: Alternate subtle backgrounds (even:bg-gray-50/50)
- Cells: Adequate padding (px-4 py-3), left-aligned text, right-aligned numbers
- Dimension inputs: Inline input fields with × separator, auto-calculate SQFT
- Material dropdowns: Styled select with defaults pre-filled
- Add/Remove: Icon buttons (+ / trash) with hover tooltips

**Room Sections:**

- Accordion-style panels for each room type (Kitchen, Living, etc.)
- Panel header: Room name, total SQFT, expand/collapse icon
- Panel body: Line item table with dimensions, materials, quantities
- False Ceiling section: Separate visual treatment with area calculation display

**OTHERS Section:**

- Simple list layout with item name, type (Lumpsum/Count), input field
- Items: Paint (Lumpsum input), Lights (number input), Fan Hook Rods (number input)

**Estimate Page:**

- Two-column layout: Interiors summary left, False Ceiling right
- Cost breakdown: Category headers, itemized costs, subtotals, grand total
- Totals: Emphasized with larger text, bold, primary color
- Visual separators: Borders between sections

**Print/Export:**

- Clean print layout without UI chrome
- Company header: TRECASA logo space + project details
- Organized sections matching estimate structure
- PDF buttons: Primary button "Export Interiors PDF", Secondary "Export False Ceiling PDF"
- Buttons with icons (download icon from Heroicons)

**Buttons & CTAs:**

- Primary: bg-primary text-white rounded-md px-4 py-2 hover:opacity-90
- Secondary: border border-primary text-primary hover:bg-primary/10
- Destructive: bg-red-600 text-white for delete actions
- Icon buttons: Rounded-full p-2 hover:bg-gray-100

**Status Badges:**

- Rounded-full px-3 py-1 text-xs font-medium
- Colors: Draft (gray), In Progress (blue), Completed (green)

**Modals/Dialogs:**

- Centered overlay with backdrop-blur
- Max-width: max-w-lg to max-w-2xl depending on content
- Close button: Top-right X icon
- Actions: Right-aligned footer with Cancel and Confirm buttons

### E. Icons

**Library:** Heroicons (via CDN)

- Navigation: home, document-text, cog
- Actions: plus, pencil, trash, printer, arrow-down-tray
- UI: chevron-down, x-mark, check

### F. Animations

**Minimal & Purposeful:**

- Button hovers: opacity or scale transitions (transition-all duration-150)
- Card hovers: shadow elevation (transition-shadow)
- Page transitions: Simple fade-in for route changes
- NO elaborate scroll animations or unnecessary motion

## Page-Specific Guidelines

**Login:** Centered card (max-w-md), TRECASA logo above, Replit Auth button, minimal decoration

**Dashboard:** Grid of quotation cards, prominent "New Quote" button (top-right), search/filter bar

**Project Info:** Single-column form, clear section headers, save/continue button at bottom

**Scope:** Tabbed interface (Interiors / False Ceiling), expandable room panels, sticky total summary

**Estimate:** Split view, professional cost breakdown, prominent export actions

**Print View:** Stripped-down, logo space at top, clean typography for printing

## Images

No hero images needed for this utility application. Focus on clean, functional interface with placeholder space for TRECASA gold logo in navbar and print headers.
