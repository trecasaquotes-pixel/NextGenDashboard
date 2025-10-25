import puppeteer, { type Browser, type Page } from "puppeteer";
import { logger } from "../utils/logger";

let browserPromise: Promise<Browser> | null = null;

async function launchBrowser(): Promise<Browser> {
  const traceId = "browser-launch";
  logger.info("Launching shared Chromium instance", { traceId });
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });
  return browser;
}

export async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = launchBrowser().catch((error) => {
      logger.error("Failed to launch Chromium", { traceId: "browser-launch", error });
      browserPromise = null;
      throw error;
    });
  }

  return browserPromise;
}

export async function withPage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    return await fn(page);
  } finally {
    await page.close();
  }
}

export async function closeBrowser(): Promise<void> {
  if (!browserPromise) return;
  try {
    const browser = await browserPromise;
    browserPromise = null;
    await browser.close();
  } catch (error) {
    logger.error("Failed to close Chromium", { traceId: "browser-shutdown", error });
    browserPromise = null;
  }
}
