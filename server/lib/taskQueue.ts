import { logger } from "../utils/logger";

type Task<T> = () => Promise<T>;

type QueueOptions = {
  concurrency: number;
  intervalCap: number;
  interval: number;
};

const DEFAULT_QUEUE_OPTIONS: QueueOptions = {
  concurrency: 2,
  intervalCap: 8,
  interval: 1000,
};

const MAX_QUEUE_SIZE = 50;

class RateLimitedQueue {
  private active = 0;
  private readonly queue: Array<{ task: Task<any>; resolve: (value: any) => void; reject: (reason: unknown) => void }> = [];
  private readonly timestamps: number[] = [];

  constructor(private readonly options: QueueOptions) {}

  get size(): number {
    return this.queue.length;
  }

  add<T>(task: Task<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.process();
    });
  }

  private process(): void {
    if (this.active >= this.options.concurrency) {
      return;
    }

    const now = Date.now();
    this.pruneTimestamps(now);

    if (this.timestamps.length >= this.options.intervalCap) {
      const wait = Math.max(this.options.interval - (now - this.timestamps[0]), 0);
      setTimeout(() => this.process(), wait);
      return;
    }

    const next = this.queue.shift();
    if (!next) {
      return;
    }

    this.active++;
    this.timestamps.push(now);

    next.task()
      .then((value) => next.resolve(value))
      .catch((error) => next.reject(error))
      .finally(() => {
        this.active = Math.max(0, this.active - 1);
        this.process();
      });
  }

  private pruneTimestamps(now: number) {
    while (this.timestamps.length > 0 && now - this.timestamps[0] > this.options.interval) {
      this.timestamps.shift();
    }
  }
}

export const pdfQueue = new RateLimitedQueue(DEFAULT_QUEUE_OPTIONS);

export async function enqueuePdf<T>(fn: Task<T>): Promise<T> {
  if (pdfQueue.size > MAX_QUEUE_SIZE) {
    const error: any = new Error("PDF queue saturated");
    error.status = 503;
    error.code = "pdf_queue_saturated";
    logger.warn("PDF queue saturated", { traceId: "pdf-queue" });
    throw error;
  }

  return pdfQueue.add(fn);
}
