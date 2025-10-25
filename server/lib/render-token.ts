import crypto from "crypto";
import { config } from "../config";
import { logger } from "../utils/logger";

const RENDER_SECRET = config.renderSecret;

/**
 * Generate a signed render token for a specific quotation
 * This allows Puppeteer to access render endpoints without user authentication
 */
export function generateRenderToken(quotationId: string): string {
  const timestamp = Date.now();
  const data = `${quotationId}:${timestamp}`;
  const signature = crypto.createHmac("sha256", RENDER_SECRET).update(data).digest("hex");

  return Buffer.from(`${data}:${signature}`).toString("base64");
}

/**
 * Verify a render token and extract the quotation ID
 * Returns quotation ID if valid, null if invalid or expired
 */
export function verifyRenderToken(token: string, quotationId: string): boolean {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [extractedId, timestampStr, signature] = decoded.split(":");

    if (!extractedId || !timestampStr || !signature) {
      return false;
    }

    // Check if token is for the correct quotation
    if (extractedId !== quotationId) {
      return false;
    }

    // Check if token is expired (5 minutes)
    const timestamp = parseInt(timestampStr, 10);
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    if (now - timestamp > maxAge) {
      logger.warn("[Render Token] Token expired", { traceId: `render-${quotationId}` });
      return false;
    }

    // Verify signature
    const data = `${extractedId}:${timestampStr}`;
    const expectedSignature = crypto.createHmac("sha256", RENDER_SECRET).update(data).digest("hex");

    if (signature !== expectedSignature) {
      logger.warn("[Render Token] Invalid signature", { traceId: `render-${quotationId}` });
      return false;
    }

    return true;
  } catch (error) {
    logger.error("[Render Token] Verification error", { traceId: `render-${quotationId}`, error });
    return false;
  }
}
