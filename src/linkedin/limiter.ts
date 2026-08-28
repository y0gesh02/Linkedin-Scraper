import Bottleneck from "bottleneck";
import { DEFAULT_REQUESTS_PER_MINUTE } from "../config/constants.js";

export function createLimiter(): Bottleneck {
  const limiter = new Bottleneck({
    reservoir: DEFAULT_REQUESTS_PER_MINUTE,
    reservoirRefreshAmount: DEFAULT_REQUESTS_PER_MINUTE,
    reservoirRefreshInterval: 60_000,
    maxConcurrent: 2,
    minTime: 500,
  });

  // Retries are handled by p-retry around fetchVoyager, not by Bottleneck itself.
  limiter.on("failed", async () => null);

  return limiter;
}

/** Random 0-1500ms jitter on top of minTime; LinkedIn's detection responds to regular burst patterns. */
export function jitter(): Promise<void> {
  const ms = Math.floor(Math.random() * 1500);
  return new Promise((resolve) => setTimeout(resolve, ms));
}
