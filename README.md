# TRECASA - Interior Design Quotation Application

A comprehensive web application designed for interior designers to efficiently create, manage, and export detailed quotations with professional branding and PDF generation capabilities.

## Features

- **Quotation Management**: Create, view, edit, and manage quotations with auto-generated unique IDs
- **Project Information**: Capture client details, project category, address, and Build Type
- **Room-based Pricing**: Detailed scope definition with dimensions, materials, and pricing
- **Professional PDF Export**: Generate branded PDFs with room-wise breakdowns and material specifications
- **Agreement Pack**: Merge multiple PDFs (service agreement, annexures, quotations) into a single document
- **Admin Interfaces**: Manage rates, templates, brands, painting packages, and global rules
- **Project Management**: Track approved projects with expense tracking and profit/loss calculations
- **Business Expenses**: Monitor monthly operational costs and overhead expenses
- **Change Orders**: Manage project modifications with detailed tracking
- **Client Portal**: Secure, token-based quotation sharing for client review and acceptance
- **Audit Log**: Complete change history with user tracking and diff viewing
- **Version History**: Automatic snapshots of quotations on every change

## Technology Stack

- **Frontend**: React, Wouter, TanStack Query, Tailwind CSS, Shadcn UI
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth (OpenID Connect)
- **PDF Generation**: html2pdf.js (client-side), Puppeteer (server-side)

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Replit environment (or configure manually)

### Installation

1. Clone the repository
2. Copy `.env.example` to `.env` and configure your environment variables
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run database migrations:
   ```bash
   npm run db:push
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5000`

## Environment Variables

See `.env.example` for a complete list of required environment variables:

- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret key for session management
- `PORT`: Server port (default: 5000)
- `CLIENT_URL`: Frontend URL for CORS configuration
- `RENDER_SECRET`: Secret for server-side PDF rendering

## Formatting & Linting

This project uses **Prettier** for code formatting and **ESLint** for linting to maintain consistent code style and catch common TypeScript/React issues.

### Quick Commands

Since package.json script modifications are restricted in this environment, use these commands directly:

```bash
# Auto-format all files
npx prettier --write .

# Check linting (all TypeScript files)
npx eslint . --ext .ts,.tsx --max-warnings=0

# Auto-fix linting errors
npx eslint . --ext .ts,.tsx --fix
```

### Recommended: Add to package.json

For convenience, manually add these scripts to your `package.json`:

```json
"scripts": {
  "format": "prettier --write .",
  "lint": "eslint . --ext .ts,.tsx --max-warnings=0",
  "lint:fix": "eslint . --ext .ts,.tsx --fix"
}
```

Then use:
```bash
npm run format
npm run lint
npm run lint:fix
```

### IDE Setup (VS Code)

A `.vscode/settings.json` file is included for automatic formatting on save. Install these extensions:
- **ESLint** (`dbaeumer.vscode-eslint`)
- **Prettier - Code formatter** (`esbenp.prettier-vscode`)

### Configuration Files

- `.prettierrc.json` - Prettier formatting rules
- `eslint.config.js` - ESLint rules for TypeScript + React
- `.lintstagedrc.json` - Pre-commit hook configuration (requires manual setup in Replit)
- `.vscode/settings.json` - VS Code format-on-save settings

## Security & Stability Notes

### Security Enhancements

This application includes basic security hardening suitable for a solo developer or small team setup:

- **Helmet.js**: Adds secure HTTP headers to protect against common web vulnerabilities
  - Content Security Policy is disabled to maintain compatibility with Vite dev server
  - Other security headers (X-Frame-Options, X-Content-Type-Options, etc.) are enabled by default

- **CORS (Cross-Origin Resource Sharing)**: Controls which domains can access the API
  - Configurable via `CLIENT_URL` environment variable
  - Set to `"*"` by default for development flexibility
  - In production, set `CLIENT_URL` to your specific frontend domain

- **Session Management**: Uses secure session handling with PostgreSQL-backed storage
  - Sessions are cryptographically signed using `SESSION_SECRET`
  - Change the session secret before deploying to production

### Environment Configuration

- **`.env.example`**: Template file listing all required environment variables
  - Does not contain real secrets - only placeholders
  - Useful when deploying to new environments or reinstalling dependencies
  - Copy to `.env` and fill in actual values before running

### Error Handling

- **React Error Boundary**: Catches unhandled errors in the React component tree
  - Displays user-friendly error message instead of blank screen
  - Provides "Refresh Page" button to recover from errors
  - Logs errors to console for debugging

### Future Enhancements

As the application grows or if you share it with more users, consider adding:

- **Rate Limiting**: Prevent abuse by limiting API requests per user/IP
- **Input Validation**: More comprehensive server-side validation for all endpoints
- **Authentication Refresh**: Token refresh mechanism for long-lived sessions
- **Database Backups**: Automated backup system for PostgreSQL database
- **Monitoring & Logging**: Structured logging and error tracking (e.g., Sentry)
- **HTTPS**: Enable SSL/TLS for production deployments
- **Content Security Policy**: Fine-tune CSP headers for production

### Important Notes

- This configuration prioritizes **stability and ease of development** over maximum security
- Suitable for internal tools, prototypes, and small team applications
- For production deployments with sensitive data, conduct a security review
- Keep dependencies updated to patch security vulnerabilities

## License

Proprietary - TRECASA Design Studio

## Support

For issues or questions, contact the development team.
