import { randomUUID } from "crypto";
import type { Response } from "express";
import { logger } from "./logger";

type LogLevel = "info" | "warn" | "error" | "none";

interface ErrorOptions {
  status?: number;
  code?: string;
  message: string;
  error?: unknown;
  level?: LogLevel;
  details?: unknown;
}

function toErrorCode(message: string): string {
  return message
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/__+/g, "_")
    .slice(0, 64) || "unexpected_error";
}

export function sendErrorResponse(res: Response, options: ErrorOptions): void {
  const status = options.status ?? 500;
  const code = options.code ?? toErrorCode(options.message);
  const traceId = typeof res.locals.traceId === "string" ? res.locals.traceId : randomUUID();
  res.locals.traceId = traceId;

  const level = options.level ?? (status >= 500 ? "error" : "warn");
  if (level !== "none") {
    if (level === "error") {
      logger.error(options.message, { traceId, error: options.error });
    } else if (level === "warn") {
      logger.warn(options.message, { traceId, error: options.error });
    } else if (level === "info") {
      logger.info(options.message, { traceId });
    }
  }

  if (!res.headersSent) {
    const payload: Record<string, unknown> = { code, message: options.message, traceId };
    if (options.details !== undefined) {
      payload.details = options.details;
    }
    res.status(status).json(payload);
  }
}
