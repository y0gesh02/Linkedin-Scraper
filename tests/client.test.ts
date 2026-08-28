import Bottleneck from "bottleneck";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AppError,
  LinkedInBlockedError,
  ProfileNotAccessibleError,
  ProfileNotFoundError,
  RateLimitedError,
  SessionExpiredError,
} from "../src/errors.js";
import { server } from "./mocks/server.js";

vi.mock("../src/config/env.js", () => ({
  env: {
    LI_AT: "test-li-at",
    JSESSIONID: '"ajax:9999999999999999999"',
  },
}));

const { VoyagerClient } = await import("../src/linkedin/client.js");
const { LinkedInSession } = await import("../src/linkedin/session.js");

const PATH = "voyager/api/identity/profiles/jane-doe/profileView";
const URL_UNDER_TEST = `https://www.linkedin.com/${PATH}`;

function fastLimiter() {
  return new Bottleneck({ maxConcurrent: 5, minTime: 0 });
}

async function makeClient() {
  const session = new LinkedInSession(undefined);
  await session.load();
  const client = new VoyagerClient(session, {
    limiter: fastLimiter(),
    disableJitter: true,
    retryOptions: {
      retries: 3,
      factor: 1,
      minTimeout: 1,
      maxTimeout: 5,
      randomize: false,
    },
  });
  return { client, session };
}

describe("VoyagerClient.fetchVoyager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns parsed JSON on 200", async () => {
    server.use(
      http.get(URL_UNDER_TEST, () => HttpResponse.json({ data: { ok: true } })),
    );
    const { client } = await makeClient();
    const body = await client.fetchVoyager(PATH);
    expect(body).toEqual({ data: { ok: true } });
  });

  it("throws LinkedInBlockedError on 200 with text/html (challenge page)", async () => {
    server.use(
      http.get(
        URL_UNDER_TEST,
        () =>
          new HttpResponse("<html>challenge</html>", {
            headers: { "content-type": "text/html" },
          }),
      ),
    );
    const { client } = await makeClient();
    await expect(client.fetchVoyager(PATH)).rejects.toBeInstanceOf(
      LinkedInBlockedError,
    );
  });

  it("throws LinkedInBlockedError on HTTP 999", async () => {
    server.use(
      http.get(URL_UNDER_TEST, () => new HttpResponse(null, { status: 999 })),
    );
    const { client } = await makeClient();
    await expect(client.fetchVoyager(PATH)).rejects.toBeInstanceOf(
      LinkedInBlockedError,
    );
  });

  it("throws ProfileNotFoundError on 404 and does not retry", async () => {
    let calls = 0;
    server.use(
      http.get(URL_UNDER_TEST, () => {
        calls += 1;
        return new HttpResponse(null, { status: 404 });
      }),
    );
    const { client } = await makeClient();
    await expect(client.fetchVoyager(PATH)).rejects.toBeInstanceOf(
      ProfileNotFoundError,
    );
    expect(calls).toBe(1);
  });

  it("throws RateLimitedError on 429 and does not retry", async () => {
    let calls = 0;
    server.use(
      http.get(URL_UNDER_TEST, () => {
        calls += 1;
        return new HttpResponse(null, { status: 429 });
      }),
    );
    const { client } = await makeClient();
    await expect(client.fetchVoyager(PATH)).rejects.toBeInstanceOf(
      RateLimitedError,
    );
    expect(calls).toBe(1);
  });

  it("triggers exactly one re-auth and retry on 401", async () => {
    let calls = 0;
    server.use(
      http.get(URL_UNDER_TEST, () => {
        calls += 1;
        if (calls === 1) return new HttpResponse(null, { status: 401 });
        return HttpResponse.json({ ok: true });
      }),
    );
    const { client } = await makeClient();
    const body = await client.fetchVoyager(PATH);
    expect(body).toEqual({ ok: true });
    expect(calls).toBe(2);
  });

  it("returns SessionExpiredError if 401 persists after re-auth", async () => {
    let calls = 0;
    server.use(
      http.get(URL_UNDER_TEST, () => {
        calls += 1;
        return new HttpResponse(null, { status: 401 });
      }),
    );
    const { client } = await makeClient();
    await expect(client.fetchVoyager(PATH)).rejects.toBeInstanceOf(
      SessionExpiredError,
    );
    expect(calls).toBe(2);
  });

  it("treats first 403 as SessionExpired (reauth+retry), second 403 as ProfileNotAccessible", async () => {
    let calls = 0;
    server.use(
      http.get(URL_UNDER_TEST, () => {
        calls += 1;
        return new HttpResponse(null, { status: 403 });
      }),
    );
    const { client } = await makeClient();
    await expect(client.fetchVoyager(PATH)).rejects.toBeInstanceOf(
      ProfileNotAccessibleError,
    );
    expect(calls).toBe(2);
  });

  it("treats a redirect to /authwall as SessionExpired, retries once", async () => {
    let calls = 0;
    server.use(
      http.get(URL_UNDER_TEST, () => {
        calls += 1;
        if (calls === 1) {
          return new HttpResponse(null, {
            status: 302,
            headers: { location: "https://www.linkedin.com/authwall" },
          });
        }
        return HttpResponse.json({ ok: true });
      }),
    );
    const { client } = await makeClient();
    const body = await client.fetchVoyager(PATH);
    expect(body).toEqual({ ok: true });
    expect(calls).toBe(2);
  });

  it("retries 5xx responses then raises a generic AppError", async () => {
    let calls = 0;
    server.use(
      http.get(URL_UNDER_TEST, () => {
        calls += 1;
        return new HttpResponse(null, { status: 500 });
      }),
    );
    const { client } = await makeClient();
    await expect(client.fetchVoyager(PATH)).rejects.toBeInstanceOf(AppError);
    // 1 initial attempt + 3 retries per retryOptions
    expect(calls).toBe(4);
  });

  it("recovers if a 5xx is followed by a 200", async () => {
    let calls = 0;
    server.use(
      http.get(URL_UNDER_TEST, () => {
        calls += 1;
        if (calls < 2) return new HttpResponse(null, { status: 500 });
        return HttpResponse.json({ ok: true });
      }),
    );
    const { client } = await makeClient();
    const body = await client.fetchVoyager(PATH);
    expect(body).toEqual({ ok: true });
    expect(calls).toBe(2);
  });
});
