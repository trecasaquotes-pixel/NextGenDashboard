import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import { randomUUID } from "crypto";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { logger } from "./utils/logger";
import { closeBrowser } from "./lib/browserManager";

const app = express();

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, async () => {
    const traceId = `shutdown-${signal.toLowerCase()}`;
    logger.warn(`Received ${signal}, closing pooled browser`, { traceId });
    await closeBrowser();
    process.exit(0);
  });
}

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable CSP to avoid breaking Vite dev server
  }),
);
const parseOrigins = (): string[] => {
  const raw = process.env.CORS_ALLOWED_ORIGINS || process.env.CLIENT_URL || "";
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};

let allowedOrigins = parseOrigins();
if (allowedOrigins.length === 0) {
  if (process.env.NODE_ENV === "development") {
    allowedOrigins = ["http://localhost:5173"]; // Default Vite dev server
    logger.warn(
      "CORS allowlist missing; defaulting to http://localhost:5173 in development only",
    );
  } else {
    const message =
      "CORS_ALLOWED_ORIGINS is not configured; refusing to boot without an allowlist";
    logger.error(message);
    throw new Error(message);
  }
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      logger.warn("Blocked CORS request", { origin });
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  if (!res.locals.traceId) {
    res.locals.traceId = randomUUID();
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    if (
      res.statusCode >= 400 &&
      bodyJson &&
      typeof bodyJson === "object" &&
      !Array.isArray(bodyJson)
    ) {
      const traceId = typeof res.locals.traceId === "string" ? res.locals.traceId : randomUUID();
      res.locals.traceId = traceId;
      const existing = bodyJson as Record<string, unknown>;
      const message = typeof existing.message === "string" ? existing.message : "Unexpected error";
      const code = typeof existing.code === "string"
        ? existing.code
        : message
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "")
            .replace(/__+/g, "_")
            .slice(0, 64) || "unexpected_error";
      const normalized = { ...existing, code, message, traceId };
      return originalResJson.apply(res, [normalized, ...args]);
    }
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      const traceId = res.locals.traceId as string | undefined;
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(traceId ? `[${traceId}] ${logLine}` : logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = typeof err.status === "number" ? err.status : typeof err.statusCode === "number" ? err.statusCode : 500;
    const message = err.message || "Internal Server Error";
    const code = typeof err.code === "string" ? err.code : "internal_error";
    const traceId = typeof res.locals.traceId === "string" ? res.locals.traceId : randomUUID();
    res.locals.traceId = traceId;

    if (!res.headersSent) {
      res.status(status).json({ code, message, traceId });
    }

    logger.error("Unhandled error", {
      traceId,
      status,
      code,
      path: req.path,
      error: err,
    });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
