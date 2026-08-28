import { readFile } from "node:fs/promises";
import path from "node:path";
import { http, HttpResponse } from "msw";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { ENDPOINTS } from "../src/config/endpoints.js";
import { server } from "./mocks/server.js";

vi.mock("../src/config/env.js", () => ({
  env: {
    LI_AT: "test-li-at",
    JSESSIONID: '"ajax:9999999999999999999"',
    API_KEY: "test-api-key",
    REDIS_URL: undefined,
  },
}));

const { buildServer } = await import("../src/server.js");

async function loadFixture(name: string): Promise<unknown> {
  const raw = await readFile(
    path.join(import.meta.dirname, "fixtures", name),
    "utf8",
  );
  return JSON.parse(raw);
}

function profileUrlFor(vanity: string): string {
  return `https://www.linkedin.com/in/${vanity}`;
}

// MSW matches request handlers by pathname only and ignores query strings
// (see https://mswjs.io/docs/http/intercepting-requests#querysearch-parameters),
// so handlers are registered against the path alone even though the real
// dashProfile URL carries `memberIdentity`/`decorationId` as query params.
function voyagerUrlFor(vanity: string): string {
  return `https://www.linkedin.com/${ENDPOINTS.dashProfile(vanity).split("?")[0]}`;
}

const PROFILE_URL = profileUrlFor("jane-doe");
const VOYAGER_URL = voyagerUrlFor("jane-doe");

describe("API", () => {
  let app: Awaited<ReturnType<typeof buildServer>>;

  beforeAll(async () => {
    app = await buildServer();
    await app.ready();
  });

  afterEach(async () => {
    server.resetHandlers();
  });

  describe("GET /health", () => {
    it("returns 200 without auth", async () => {
      const response = await app.inject({ method: "GET", url: "/health" });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe("ok");
      expect(body.sessionValid).toBe(true);
    });
  });

  describe("GET /docs", () => {
    it("renders", async () => {
      const response = await app.inject({ method: "GET", url: "/docs/" });
      expect(response.statusCode).toBe(200);
    });
  });

  describe("GET /", () => {
    it("renders the test console", async () => {
      const response = await app.inject({ method: "GET", url: "/" });
      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("text/html");
      expect(response.body).toContain("/api/v1/profile");
    });
  });

  describe("POST /api/v1/profile", () => {
    function postProfile(payload: Record<string, unknown>, apiKey?: string) {
      return app.inject({
        method: "POST",
        url: "/api/v1/profile",
        headers: {
          "content-type": "application/json",
          ...(apiKey !== undefined ? { "x-api-key": apiKey } : {}),
        },
        payload,
      });
    }

    it("returns 401 with no API key", async () => {
      const response = await postProfile({ url: PROFILE_URL });
      expect(response.statusCode).toBe(401);
      expect(response.json().error.code).toBe("UNAUTHORIZED");
    });

    it("returns 401 with a wrong API key", async () => {
      const response = await postProfile({ url: PROFILE_URL }, "wrong-key");
      expect(response.statusCode).toBe(401);
    });

    it("returns 400 for an invalid profile URL", async () => {
      const response = await postProfile(
        { url: "https://www.linkedin.com/company/acme" },
        "test-api-key",
      );
      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe("INVALID_PROFILE_URL");
    });

    it("returns 200 and a validated profile on success, then serves the second request from cache", async () => {
      let calls = 0;
      server.use(
        http.get(VOYAGER_URL, async () => {
          calls += 1;
          return HttpResponse.json(await loadFixture("dense.json"));
        }),
      );

      const first = await postProfile({ url: PROFILE_URL }, "test-api-key");
      expect(first.statusCode).toBe(200);
      const firstBody = first.json();
      expect(firstBody.cached).toBe(false);
      expect(firstBody.publicIdentifier).toBe("jane-doe");
      expect(firstBody.experience.length).toBeGreaterThan(0);

      const second = await postProfile({ url: PROFILE_URL }, "test-api-key");
      expect(second.statusCode).toBe(200);
      expect(second.json().cached).toBe(true);
      expect(calls).toBe(1);
    });

    it("bypasses the cache with refresh: true", async () => {
      const vanity = "jane-doe-refresh";
      let calls = 0;
      server.use(
        http.get(voyagerUrlFor(vanity), async () => {
          calls += 1;
          return HttpResponse.json(await loadFixture("dense.json"));
        }),
      );

      await postProfile({ url: profileUrlFor(vanity) }, "test-api-key");
      const refreshed = await postProfile(
        { url: profileUrlFor(vanity), refresh: true },
        "test-api-key",
      );
      expect(refreshed.json().cached).toBe(false);
      expect(calls).toBe(2);
    });

    it("returns 404 when LinkedIn returns 404", async () => {
      const vanity = "does-not-exist";
      server.use(
        http.get(
          voyagerUrlFor(vanity),
          () => new HttpResponse(null, { status: 404 }),
        ),
      );
      const response = await postProfile(
        { url: profileUrlFor(vanity) },
        "test-api-key",
      );
      expect(response.statusCode).toBe(404);
      expect(response.json().error.code).toBe("PROFILE_NOT_FOUND");
    });

    it("returns 502 LINKEDIN_BLOCKED on an HTML challenge page", async () => {
      server.use(
        http.get(
          voyagerUrlFor("blocked-user"),
          () =>
            new HttpResponse("<html>challenge</html>", {
              headers: { "content-type": "text/html" },
            }),
        ),
      );
      const response = await postProfile(
        { url: "https://www.linkedin.com/in/blocked-user" },
        "test-api-key",
      );
      expect(response.statusCode).toBe(502);
      expect(response.json().error.code).toBe("LINKEDIN_BLOCKED");
    });

    it("returns 200 with meta.sectionsFailed when a section fails validation, not a 500", async () => {
      server.use(
        http.get(voyagerUrlFor("broken-skill"), () =>
          HttpResponse.json({
            included: [
              {
                $type: "com.linkedin.voyager.dash.identity.profile.Profile",
                entityUrn:
                  "urn:li:fsd_profile:ACoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
                firstName: "Test",
                lastName: "User",
              },
              {
                $type: "com.linkedin.voyager.dash.identity.profile.Skill",
                entityUrn: "urn:li:fsd_skill:1",
                name: "TypeScript",
                endorsementCount: "not-a-number",
              },
            ],
          }),
        ),
      );
      const response = await postProfile(
        { url: "https://www.linkedin.com/in/broken-skill" },
        "test-api-key",
      );
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.meta.sectionsFailed).toContain("skills");
      expect(body.skills).toEqual([]);
    });
  });
});
