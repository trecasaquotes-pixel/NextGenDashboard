import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    console.error("Failed to create data directory:", error);
  }
}

// Debounce map to prevent too frequent writes
const debounceTimers: Map<string, NodeJS.Timeout> = new Map();

export async function saveJSON(filepath: string, data: any): Promise<void> {
  await ensureDataDir();

  const fullPath = path.join(DATA_DIR, filepath);

  // Clear existing debounce timer for this file
  const existingTimer = debounceTimers.get(filepath);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Debounce writes by 300ms
  return new Promise((resolve, reject) => {
    const timer = setTimeout(async () => {
      try {
        const jsonData = JSON.stringify(data, null, 2);
        await fs.writeFile(fullPath, jsonData, "utf-8");
        debounceTimers.delete(filepath);
        console.log(`[Store] Saved ${filepath}`);
        resolve();
      } catch (error) {
        console.error(`[Store] Failed to save ${filepath}:`, error);
        debounceTimers.delete(filepath);
        reject(error);
      }
    }, 300);

    debounceTimers.set(filepath, timer);
  });
}

export async function loadJSON<T>(filepath: string, fallback: T): Promise<T> {
  await ensureDataDir();

  const fullPath = path.join(DATA_DIR, filepath);

  try {
    const data = await fs.readFile(fullPath, "utf-8");
    console.log(`[Store] Loaded ${filepath}`);
    return JSON.parse(data) as T;
  } catch (error: any) {
    if (error.code === "ENOENT") {
      // File doesn't exist, create it with fallback data
      console.log(`[Store] Creating ${filepath} with default data`);
      await saveJSON(filepath, fallback);
      return fallback;
    }
    console.error(`[Store] Failed to load ${filepath}:`, error);
    return fallback;
  }
}

// Get data directory path (for backups)
export function getDataDir(): string {
  return DATA_DIR;
}

// Flush all pending writes immediately (useful for testing/shutdown)
export async function flushAllWrites(): Promise<void> {
  const pendingTimers = Array.from(debounceTimers.entries());

  for (const [filepath, timer] of pendingTimers) {
    clearTimeout(timer);
  }

  debounceTimers.clear();
}
