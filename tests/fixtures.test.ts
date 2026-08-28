import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const FIXTURES_DIR = path.join(import.meta.dirname, "fixtures");
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
// A "real-looking" ACoAA URN has mixed-case/digit noise after the prefix.
// Our placeholder is a run of literal 'A's, which this deliberately excludes.
const REAL_MEMBER_URN_RE = /ACoA[A-Za-z0-9_-]*[a-z0-9][A-Za-z0-9_-]*/;

async function fixtureFiles(): Promise<string[]> {
  const entries = await readdir(FIXTURES_DIR);
  return entries.filter((name) => name.endsWith(".json"));
}

describe("fixtures are redacted", () => {
  it("has at least three fixtures", async () => {
    const files = await fixtureFiles();
    expect(files.length).toBeGreaterThanOrEqual(3);
  });

  it("contains no email-shaped strings or real-looking ACoAA URNs", async () => {
    const files = await fixtureFiles();
    for (const file of files) {
      const content = await readFile(path.join(FIXTURES_DIR, file), "utf8");
      expect(content, `${file} contains an email-shaped string`).not.toMatch(EMAIL_RE);
      expect(content, `${file} contains a real-looking ACoAA URN`).not.toMatch(REAL_MEMBER_URN_RE);
    }
  });
});
