# Trecasa NextGen Dashboard — Deployment & Maintenance Guide (v1.0.0)

## Overview
The Trecasa NextGen Dashboard is a full-stack platform that unifies quotation management, PDF agreement generation, and administrative tooling for Trecasa Design Studio. The stack comprises a Vite/React frontend, an Express + Drizzle ORM API, and a shared schema package. PDF exports rely on Puppeteer, html2pdf.js, and pdf-lib, all orchestrated through a pooled Chromium manager and a rate-limited queue for throughput and stability.

This guide documents the required environment, deployment flow, CI expectations, smoke testing, troubleshooting procedures, rollback playbooks, ongoing maintenance tasks, ownership details, and the expected final system state after a production release.

## Environment Setup
1. **Node.js**: Use Node 20.x for both local development and production builds.
2. **Package Manager**: npm (npm ci for deterministic installs).
3. **Environment Variables**:
   - `NODE_ENV`: `development`, `staging`, or `production`.
   - `PORT`: API listening port (default 8080 in production).
   - `BASE_URL`: Public API base URL (e.g., `https://api.trecasa.app`).
   - `SESSION_SECRET`: Required for session cookies.
   - `RENDER_SECRET`: Required for render-token verification.
   - `COOKIE_SECURE`: `true` in production; `false` permitted only when `NODE_ENV=development`.
   - `COOKIE_SAME_SITE`: `lax`, `strict`, or `none`.
   - `ALLOWLIST_ORIGINS`: Comma-separated list of allowed web origins.
   - `LOG_LEVEL`: `info` in production; `debug` recommended for local troubleshooting.
   - `VITE_API_URL`: Frontend environment variable pointing to the API base.
4. **Secrets Management**: Store secrets in Railway environment variables and Vercel project settings. Mirror values into GitHub Actions secrets for CI smoke tests.
5. **Dependencies**: Install system dependencies for Puppeteer (`npx playwright install --with-deps` in CI, `apt-get install -y libnss3` if running on bare metal).

## Deployment Flow
1. **Prepare Release Branch**: Merge the tested feature branches into `main`. Tag releases following semantic versioning (e.g., `v1.0.0`).
2. **CI Verification**: Ensure the `check` workflow passes on the release commit (`npm run check`, `ts-prune`, Playwright smoke suite).
3. **Backend (Railway)**:
   - Build command: `npm ci && npm run build`.
   - Start command: `npm run start` (launches Express with pooled Chromium).
   - Environment: Node 20, port 8080, `--no-sandbox --disable-setuid-sandbox` flags injected via `PUPPETEER_EXECUTABLE_PATH` or start script.
   - Confirm the `ALLOWLIST_ORIGINS` matches the production frontend domain.
4. **Frontend (Vercel)**:
   - Build command: `npm ci && npm run -w client build`.
   - Output: `client/dist`.
   - Set `VITE_API_URL=https://api.trecasa.app`.
   - Assign domain `nextgendashboard.trecasa.com`.
5. **Post-Deploy Smoke**: Run `npm run smoke` with `BASE_URL=https://nextgendashboard.trecasa.com` to verify Agreement Pack downloads.

## Continuous Integration (CI)
- Workflow: `.github/workflows/ci.yml` runs on push and pull requests.
- Steps:
  1. Checkout repository.
  2. Set npm registry (`https://registry.npmjs.org/`).
  3. Install Node 20.
  4. `npm ci` for dependencies.
  5. `npm run check` → executes `tsc --noEmit` and ESLint with zero warnings policy.
  6. `npx ts-prune` to block unused exports.
  7. `npx playwright install --with-deps` and `npm run smoke` for end-to-end PDF validation.
- Failure Policy: CI must be green before merging to `main`. Failing lint/types or smoke tests blocks deployment.

## Smoke Testing
- Command: `npm run smoke` (Playwright).
- Flow:
  1. Log in with production credentials via UI.
  2. Seed a quote through the API helper.
  3. Trigger Agreement Pack download.
  4. Assert filename pattern `Trecasa_AgreementPack_<CLIENT>_<QUOTEID>.pdf`.
  5. Verify `Content-Type: application/pdf`, page count > 0, and sanitized client name.
- Artifacts: Playwright stores traces and screenshots under `smoke/artifacts`. Upload failures to the incident tracker.

## Troubleshooting
- **CI Failures**:
  - *Type/Lint Errors*: Run `npm run check` locally; fix TS or ESLint violations.
  - *ts-prune*: Remove unused exports or annotate intentional re-exports.
  - *Smoke Failures*: Inspect Playwright trace, verify credentials, ensure API base URL is reachable.
- **PDF Queue Saturation**:
  - Logs will show `PDF queue saturated` with `code=PDF_QUEUE_SATURATED`.
  - Increase queue `intervalCap` cautiously or scale horizontally by adding instances.
- **Chromium Launch Errors**:
  - Check that `--no-sandbox` flags are applied in restricted environments.
  - Verify Railway has sufficient memory; restart service to refresh pooled browser.
- **CORS Issues**:
  - Confirm origin exists in `ALLOWLIST_ORIGINS` and redeploy backend if updates are needed.
- **Authentication Problems**:
  - Ensure `COOKIE_SECURE` matches environment.
  - Check `RENDER_SECRET` persistence across deployments.

## Rollback Procedure
1. Identify last known good tag (e.g., `v1.0.0`).
2. Revert Railway deployment to the previous build or redeploy from the known-good tag.
3. Revert Vercel frontend to the previous deployment via dashboard.
4. Communicate downtime and rollback status to stakeholders in #trecasa-ops.
5. Open a retrospective ticket capturing root cause, mitigation, and follow-up tasks.

## Maintenance Checklist
- Weekly: Review CI runs, ensure lint/type checks remain green.
- Bi-weekly: Run smoke tests manually against staging and production.
- Monthly: Rotate `SESSION_SECRET` and `RENDER_SECRET` after validating cookie invalidation procedure.
- Quarterly: Audit dependencies (`npm outdated`), update Puppeteer/Playwright, and revalidate PDF templates visually.
- Release Cycle: Prepare changelog, run `npm run check`, `npm run smoke`, and verify queue telemetry before tagging.

## Ownership
- **Engineering Lead**: Oversees deployments, reviews CI results, approves release tags.
- **DevOps/Platform**: Maintains Railway and Vercel configurations, monitors logs and infrastructure metrics.
- **Design Operations**: Reviews Agreement Pack branding, ensures Montserrat typography and #E50914 accent remain consistent.
- **Support**: Handles user-reported issues, triages with bug template (see release QA checklist).

## Final State
A healthy production environment exhibits:
- Successful `check` workflow on `main` commits.
- Railway logs showing `pdf_pack` telemetry with durations and page counts.
- Smoke tests passing against `https://nextgendashboard.trecasa.com`.
- No orphaned Chromium processes upon shutdown.
- Agreement Pack downloads with sanitized filenames, accurate totals, and brand-consistent styling.

Follow this guide for every release to ensure the Trecasa NextGen Dashboard remains secure, performant, and aligned with brand expectations.
