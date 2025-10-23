import { customAlphabet } from "nanoid";
import { db } from "../db";
import { quotations } from "@shared/schema";
import { eq } from "drizzle-orm";

const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", 32);

export function createClientToken(): string {
  return nanoid();
}

export async function verifyClientToken(quoteId: string, token: string): Promise<boolean> {
  if (!token) {
    return false;
  }

  const quote = await db.select().from(quotations).where(eq(quotations.id, quoteId)).limit(1);

  if (!quote || quote.length === 0) {
    return false;
  }

  const quotation = quote[0];

  // Check if token matches
  if (quotation.clientToken !== token) {
    return false;
  }

  // Check if token is expired (if expiry is set)
  if (quotation.clientTokenExpiresAt) {
    const now = Date.now();
    if (now > quotation.clientTokenExpiresAt) {
      return false;
    }
  }

  return true;
}
