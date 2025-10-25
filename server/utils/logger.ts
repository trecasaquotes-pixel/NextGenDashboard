import { log as viteLog } from "../vite";

type LogLevel = "info" | "error" | "warn";

interface LogMeta {
  traceId?: string;
  [key: string]: unknown;
}

function serializeMeta(meta?: LogMeta): string {
  if (!meta) return "";
  const filtered = Object.fromEntries(
    Object.entries(meta).filter(([, value]) => value !== undefined && value !== null),
  );
  const serialized = JSON.stringify(filtered);
  return serialized === "{}" ? "" : ` ${serialized}`;
}

function write(level: LogLevel, message: string, meta?: LogMeta) {
  const suffix = serializeMeta(meta);
  if (level === "info") {
    viteLog(`${message}${suffix}`, "server");
    return;
  }

  if (level === "warn") {
    if (suffix) {
      console.warn(message, JSON.parse(suffix.trim()));
    } else {
      console.warn(message);
    }
    return;
  }

  if (suffix) {
    console.error(message, JSON.parse(suffix.trim()));
  } else {
    console.error(message);
  }
}

export const logger = {
  info(message: string, meta?: LogMeta) {
    write("info", message, meta);
  },
  warn(message: string, meta?: LogMeta) {
    write("warn", message, meta);
  },
  error(message: string, meta?: LogMeta & { error?: unknown }) {
    const { error, ...rest } = meta ?? {};
    write("error", message, rest);
    if (error) {
      console.error(error);
    }
  },
};
