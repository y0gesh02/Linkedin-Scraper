import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveImage } from "../src/parsers/images.js";
import { buildIndex, byType, resolve, resolveMany } from "../src/parsers/normalizer.js";

async function loadFixture(name: string): Promise<unknown> {
  const raw = await readFile(path.join(import.meta.dirname, "fixtures", name), "utf8");
  return JSON.parse(raw);
}

describe("buildIndex / resolve / byType", () => {
  it("indexes every entity in included[] by entityUrn", async () => {
    const payload = await loadFixture("dense.json");
    const index = buildIndex(payload);
    const included = (payload as { included: unknown[] }).included;
    expect(index.size).toBe(included.length);
  });

  it("resolves a known URN to its entity", async () => {
    const index = buildIndex(await loadFixture("dense.json"));
    const entity = resolve(index, "urn:li:fsd_company:1");
    expect(entity?.name).toBe("Acme Corp");
  });

  it("returns undefined for a dangling URN rather than throwing", async () => {
    const index = buildIndex(await loadFixture("dense.json"));
    expect(resolve(index, "urn:li:fsd_company:does-not-exist")).toBeUndefined();
    expect(() => resolve(index, "urn:li:fsd_company:does-not-exist")).not.toThrow();
  });

  it("resolveMany drops dangling references and keeps resolvable ones", async () => {
    const index = buildIndex(await loadFixture("dense.json"));
    const resolved = resolveMany(index, ["urn:li:fsd_company:1", "urn:li:fsd_company:missing"]);
    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.name).toBe("Acme Corp");
  });

  it("byType matches on $type suffix regardless of namespace", async () => {
    const index = buildIndex(await loadFixture("dense.json"));
    const positions = byType(index, "profile.Position");
    expect(positions.length).toBe(3);
  });

  it("returns an empty index for a payload with no included[]", () => {
    const index = buildIndex({ data: {} });
    expect(index.size).toBe(0);
  });
});

describe("resolveImage", () => {
  it("picks the largest artifact by width and exposes the full ladder as variants", () => {
    const vectorImage = {
      rootUrl: "https://media.licdn.com/root_",
      artifacts: [
        { width: 100, height: 100, fileIdentifyingUrlPathSegment: "small" },
        { width: 800, height: 800, fileIdentifyingUrlPathSegment: "large" },
        { width: 400, height: 400, fileIdentifyingUrlPathSegment: "medium" },
      ],
    };
    const result = resolveImage(vectorImage);
    expect(result?.url).toBe("https://media.licdn.com/root_large");
    expect(result?.width).toBe(800);
    expect(result?.variants).toHaveLength(3);
  });

  it("returns null when there is no rootUrl or artifacts", () => {
    expect(resolveImage(undefined)).toBeNull();
    expect(resolveImage({ rootUrl: "x" })).toBeNull();
    expect(resolveImage({ artifacts: [] })).toBeNull();
  });
});
