import type Bottleneck from "bottleneck";
import got, { type Got } from "got";
import pRetry, { AbortError } from "p-retry";
import {
  AppError,
  LinkedInBlockedError,
  ParseError,
  ProfileNotAccessibleError,
  ProfileNotFoundError,
  RateLimitedError,
  SessionExpiredError,
} from "../errors.js";
import { createLimiter, jitter } from "./limiter.js";
import type { LinkedInSession } from "./session.js";

export interface RetryOptions {
  retries: number;
  factor: number;
  minTimeout: number;
  maxTimeout: number;
  randomize: boolean;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  retries: 3,
  factor: 2,
  minTimeout: 2000,
  maxTimeout: 30_000,
  randomize: true,
};

export interface VoyagerClientOptions {
  limiter?: Bottleneck;
  retryOptions?: RetryOptions;
  /** Skips the random inter-request jitter. Only meant for tests. */
  disableJitter?: boolean;
}

/**
 * Authenticated, rate-limited, retrying client for LinkedIn's Voyager API.
 *
 * All outbound calls funnel through fetchVoyager() so the transport (got,
 * presenting a Node-shaped TLS fingerprint that no real browser matches) can
 * be swapped for something like curl-impersonate later without touching
 * callers.
 */
export class VoyagerClient {
  private readonly http: Got;
  private readonly limiter: Bottleneck;
  private readonly retryOptions: RetryOptions;
  private readonly disableJitter: boolean;

  constructor(
    private readonly session: LinkedInSession,
    options: VoyagerClientOptions = {},
  ) {
    this.limiter = options.limiter ?? createLimiter();
    this.retryOptions = options.retryOptions ?? DEFAULT_RETRY_OPTIONS;
    this.disableJitter = options.disableJitter ?? false;

    this.http = got.extend({
      prefixUrl: "https://www.linkedin.com",
      // No http2 here: got's HTTP/2 path bypasses Node's http/https modules
      // entirely, which is exactly what MSW patches to keep tests offline.
      // Voyager works fine over HTTP/1.1 — this is the same protocol curl uses.
      followRedirect: false,
      throwHttpErrors: false,
      responseType: "text",
      // got retries 429/5xx internally regardless of throwHttpErrors. p-retry
      // around fetchWithRetry is the single source of retry policy here.
      retry: { limit: 0 },
      timeout: { request: 20_000, connect: 10_000 },
      hooks: {
        beforeRequest: [
          (request) => {
            Object.assign(request.headers, this.session.headers);
          },
        ],
      },
    });
  }

  /** Fetches a Voyager path (no leading slash) and returns the parsed JSON body. */
  async fetchVoyager(path: string): Promise<unknown> {
    return this.limiter.schedule(() => this.fetchWithRetry(path));
  }

  private async fetchWithRetry(path: string): Promise<unknown> {
    try {
      return await pRetry(async () => {
        if (!this.disableJitter) await jitter();
        return this.doFetch(path);
      }, this.retryOptions);
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(
        "LINKEDIN_UNAVAILABLE",
        "LinkedIn did not return a usable response after retrying",
        502,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  private async doFetch(
    path: string,
    isRetryAfterReauth = false,
  ): Promise<unknown> {
    const response = await this.http.get(path);
    const status = response.statusCode;
    const contentType = String(response.headers["content-type"] ?? "");
    const location = String(response.headers.location ?? "");

    if (status === 200) {
      if (contentType.includes("text/html")) {
        throw new AbortError(
          new LinkedInBlockedError("Received an HTML challenge page"),
        );
      }
      try {
        return JSON.parse(response.body);
      } catch {
        throw new AbortError(
          new ParseError("Response body was not valid JSON"),
        );
      }
    }

    if (status === 301 || status === 302) {
      if (/\/(authwall|checkpoint)/.test(location)) {
        return this.handleSessionExpired(
          path,
          isRetryAfterReauth,
          "Redirected to authwall",
        );
      }
      // LinkedIn sometimes redirects back to the same URL or to an unexpected
      // location — most commonly a sign of an expired or malformed session.
      // Treat it like a blocked/unavailable request rather than surfacing a
      // raw internal URL in the error response.
      throw new AbortError(
        new LinkedInBlockedError(
          "Unable to get LinkedIn profile — LinkedIn redirected the request unexpectedly. " +
            "This usually means your session cookie is expired or invalid. " +
            "Please refresh your LI_AT and JSESSIONID cookies.",
        ),
      );
    }

    if (status === 401) {
      return this.handleSessionExpired(
        path,
        isRetryAfterReauth,
        "401 Unauthorized",
      );
    }

    if (status === 403) {
      throw new AbortError(new ProfileNotAccessibleError(path));
    }

    if (status === 404) {
      throw new AbortError(new ProfileNotFoundError(path));
    }

    if (status === 429) {
      throw new AbortError(
        new RateLimitedError(String(response.headers["retry-after"] ?? "")),
      );
    }

    if (status === 999) {
      throw new AbortError(
        new LinkedInBlockedError("LinkedIn returned HTTP 999"),
      );
    }

    if (status >= 500) {
      // Not wrapped in AbortError: let p-retry retry, then fetchWithRetry
      // wraps whatever escapes into a generic AppError.
      throw new Error(`LinkedIn returned ${status}`);
    }

    throw new AbortError(
      new AppError("UNEXPECTED_STATUS", `Unexpected status ${status}`, 502),
    );
  }

  private async handleSessionExpired(
    path: string,
    isRetryAfterReauth: boolean,
    reason: string,
  ): Promise<unknown> {
    if (isRetryAfterReauth) {
      throw new AbortError(
        new SessionExpiredError(
          `Re-authentication did not restore a valid session (${reason})`,
        ),
      );
    }
    await this.session.reauthenticate();
    if (!this.session.isLoaded) {
      throw new AbortError(new SessionExpiredError(reason));
    }
    return this.doFetch(path, true);
  }
}
