import type { Redis } from "ioredis";
import { DEFAULT_USER_AGENT } from "../config/constants.js";
import { env } from "../config/env.js";

const REDIS_SESSION_KEY = "linkedin:session:cookies";

interface StoredCookies {
  liAt: string;
  jsessionid: string;
}

export class LinkedInSession {
  private liAt: string | undefined;
  private jsessionid: string | undefined;
  private reauthenticating: Promise<void> | undefined;

  constructor(private readonly redis: Redis | undefined) {}

  async load(): Promise<void> {
    const fromRedis = await this.loadFromRedis();
    if (fromRedis) {
      this.liAt = fromRedis.liAt;
      this.jsessionid = fromRedis.jsessionid;
      return;
    }

    if (env.LI_AT && env.JSESSIONID) {
      this.liAt = env.LI_AT;
      this.jsessionid = env.JSESSIONID;
      return;
    }

    this.liAt = undefined;
    this.jsessionid = undefined;
  }

  async persist(): Promise<void> {
    if (!this.redis || !this.liAt || !this.jsessionid) return;
    const payload: StoredCookies = {
      liAt: this.liAt,
      jsessionid: this.jsessionid,
    };
    await this.redis.set(REDIS_SESSION_KEY, JSON.stringify(payload));
  }

  get isLoaded(): boolean {
    return Boolean(this.liAt && this.jsessionid);
  }

  get cookieHeader(): string {
    this.assertLoaded();
    // JSESSIONID keeps its surrounding quotes in the cookie header.
    return `li_at=${this.liAt}; JSESSIONID=${this.jsessionid}`;
  }

  get csrfToken(): string {
    this.assertLoaded();
    // ...but the csrf-token header is the same value with the quotes stripped.
    // This asymmetry is real, not a bug: LinkedIn expects the raw JSESSIONID
    // token here even though the cookie transmits it quoted.
    return this.stripQuotes(this.jsessionid as string);
  }

  get headers(): Record<string, string> {
    this.assertLoaded();
    return {
      cookie: this.cookieHeader,
      "csrf-token": this.csrfToken,
      accept: "application/vnd.linkedin.normalized+json+2.1",
      "x-restli-protocol-version": "2.0.0",
      "x-li-lang": "en_US",
      "user-agent": DEFAULT_USER_AGENT,
      "accept-language": "en-US,en;q=0.9",
      referer: "https://www.linkedin.com/feed/",
    };
  }

  /**
   * Re-derives session state. There is no programmatic login path — this
   * reloads from Redis/env in case an operator rotated the cookies out of
   * band. Concurrent callers share one in-flight attempt so a burst of
   * SessionExpiredError responses doesn't trigger a re-auth storm.
   */
  async reauthenticate(): Promise<void> {
    if (this.reauthenticating) {
      return this.reauthenticating;
    }
    this.reauthenticating = this.load().finally(() => {
      this.reauthenticating = undefined;
    });
    return this.reauthenticating;
  }

  private async loadFromRedis(): Promise<StoredCookies | undefined> {
    if (!this.redis) return undefined;
    const raw = await this.redis.get(REDIS_SESSION_KEY);
    if (!raw) return undefined;
    try {
      const parsed = JSON.parse(raw) as Partial<StoredCookies>;
      if (
        typeof parsed.liAt === "string" &&
        typeof parsed.jsessionid === "string"
      ) {
        return { liAt: parsed.liAt, jsessionid: parsed.jsessionid };
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  private stripQuotes(value: string): string {
    return value.replace(/^"|"$/g, "");
  }

  private assertLoaded(): void {
    if (!this.isLoaded) {
      throw new Error(
        "LinkedInSession accessed before a valid session was loaded",
      );
    }
  }
}
