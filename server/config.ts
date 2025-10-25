import { randomUUID } from "crypto";
import { z } from "zod";
import { logger } from "./utils/logger";

type CookieSameSite = "lax" | "strict" | "none";

const booleanSchema = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

const configSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    RENDER_SECRET: z.string().min(1, "RENDER_SECRET is required"),
    SESSION_SECRET: z.string().min(1, "SESSION_SECRET is required"),
    COOKIE_SECURE: booleanSchema.default("true"),
    COOKIE_SAME_SITE: z
      .enum(["lax", "strict", "none"])
      .default("lax"),
  })
  .superRefine((data, ctx) => {
    if (data.COOKIE_SAME_SITE === "none" && data.COOKIE_SECURE === false && data.NODE_ENV !== "development") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["COOKIE_SECURE"],
        message: "COOKIE_SECURE must be true when COOKIE_SAME_SITE is 'none' outside development",
      });
    }

    if (data.COOKIE_SECURE === false && data.NODE_ENV !== "development") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["COOKIE_SECURE"],
        message: "COOKIE_SECURE can only be false in development",
      });
    }
  });

function parseConfig() {
  const traceId = randomUUID();
  try {
    const parsed = configSchema.parse({
      NODE_ENV: process.env.NODE_ENV ?? undefined,
      RENDER_SECRET: process.env.RENDER_SECRET ?? undefined,
      SESSION_SECRET: process.env.SESSION_SECRET ?? undefined,
      COOKIE_SECURE: process.env.COOKIE_SECURE ?? undefined,
      COOKIE_SAME_SITE: process.env.COOKIE_SAME_SITE ?? undefined,
    });

    return {
      env: parsed.NODE_ENV,
      renderSecret: parsed.RENDER_SECRET,
      sessionSecret: parsed.SESSION_SECRET,
      cookies: {
        secure: parsed.COOKIE_SECURE,
        sameSite: parsed.COOKIE_SAME_SITE as CookieSameSite,
      },
    };
  } catch (error) {
    logger.error("Configuration validation failed", { traceId, error });
    throw error;
  }
}

export const config = parseConfig();
