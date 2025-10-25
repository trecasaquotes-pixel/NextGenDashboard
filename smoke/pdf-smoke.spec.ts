import fs from "node:fs/promises";

import { APIRequestContext, expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

const baseURL = process.env.BASE_URL && process.env.BASE_URL.length > 0
  ? process.env.BASE_URL
  : "https://nextgendashboard.trecasa.com";
const sessionCookie = process.env.SMOKE_SESSION_COOKIE;
const defaultClientName = process.env.SMOKE_CLIENT_NAME ?? "Smoke Client";

function sanitizeClientName(name: string, fallback: string): string {
  let safeClientName = name
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .toUpperCase()
    .trim()
    .replace(/^_+|_+$/g, "");

  if (!safeClientName || !/[A-Z0-9]/.test(safeClientName)) {
    safeClientName = fallback.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  }

  if (!safeClientName) {
    safeClientName = fallback.toUpperCase();
  }

  return safeClientName;
}

async function authenticatedApi(request: APIRequestContext, cookieValue: string) {
  return await request.newContext({
    baseURL,
    extraHTTPHeaders: {
      cookie: `connect.sid=${cookieValue}`,
    },
  });
}

test.describe("Agreement Pack PDF smoke test", () => {
  test.skip(!sessionCookie, "Set SMOKE_SESSION_COOKIE to enable smoke tests.");

  test("logs in, creates a quote, and downloads the Agreement Pack", async (
    { context, page, request },
    testInfo,
  ) => {
    if (!sessionCookie) {
      test.skip();
    }

    const cookieDomain = new URL(baseURL).hostname;
    await context.addCookies([
      {
        name: "connect.sid",
        value: sessionCookie!,
        domain: cookieDomain,
        path: "/",
        httpOnly: true,
        secure: baseURL.startsWith("https"),
      },
    ]);

    const api = await authenticatedApi(request, sessionCookie!);
    let quotationId: string | undefined;
    let quoteId: string | undefined;

    try {
      const createRes = await api.post("/api/quotations", {
        data: {
          projectName: `Smoke QA Project ${Date.now()}`,
          projectType: "Residential 3BHK",
          clientSuffix: "Mr",
          clientName: defaultClientName,
          clientEmail: "smoke.qa@example.com",
          clientPhone: "9999999999",
          projectAddress: "123 Smoke Street, QA City",
          buildType: "handmade",
          discountType: "percent",
          discountValue: "0",
        },
      });

      expect(createRes.ok()).toBeTruthy();
      const quotation = await createRes.json();
      quotationId = quotation.id as string;
      quoteId = quotation.quoteId as string;

      const lockRes = await api.post(`/api/quotations/${quotationId}/lock`);
      expect(lockRes.ok()).toBeTruthy();

      const interiorRes = await api.post(`/api/quotations/${quotationId}/interior-items`, {
        data: {
          roomType: "Living Room",
          description: "Smoke QA Wardrobe",
          calc: "SQFT",
          length: "10",
          height: "8",
          width: "2",
          buildType: "handmade",
          material: "Generic Ply",
          finish: "Generic Laminate",
          hardware: "Nimmi",
          isRateOverridden: false,
        },
      });
      expect(interiorRes.ok()).toBeTruthy();

      const fcRes = await api.post(`/api/quotations/${quotationId}/false-ceiling-items`, {
        data: {
          roomType: "Living Room",
          description: "Smoke QA Ceiling",
          length: "10",
          width: "10",
          unitPrice: "150",
          rateAuto: "150",
          isRateOverridden: false,
        },
      });
      expect(fcRes.ok()).toBeTruthy();

      const releaseRes = await api.delete(`/api/quotations/${quotationId}/lock`);
      expect(releaseRes.ok()).toBeTruthy();

      await page.goto(`/quotation/${quotationId}/agreement`);
      await page.waitForLoadState("networkidle");
      await page.waitForSelector('[data-testid="button-download-agreement-pack"]');

      const downloadPromise = page.waitForEvent("download");
      await page.getByTestId("button-download-agreement-pack").click();
      const download = await downloadPromise;

      const sanitizedClientName = sanitizeClientName(defaultClientName, quoteId!);
      expect(download.suggestedFilename()).toBe(
        `Trecasa_AgreementPack_${sanitizedClientName}_${quoteId}.pdf`,
      );

      let filePath = await download.path();
      if (!filePath) {
        filePath = testInfo.outputPath(download.suggestedFilename());
        await download.saveAs(filePath);
      }

      const pdfBuffer = await fs.readFile(filePath);
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      expect(pdfDoc.getPageCount()).toBeGreaterThan(0);
    } finally {
      if (quotationId) {
        await api.delete(`/api/quotations/${quotationId}`).catch(() => undefined);
      }
      await api.dispose();
    }
  });
});
