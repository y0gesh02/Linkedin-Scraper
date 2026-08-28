import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseBasics, parseImages } from "../src/parsers/basics.js";
import { parseCertifications } from "../src/parsers/certifications.js";
import { parseEducation } from "../src/parsers/education.js";
import { parseExperience } from "../src/parsers/experience.js";
import {
  parseHonors,
  parseProjects,
  parsePublications,
  parseVolunteer,
} from "../src/parsers/extras.js";
import { parseLanguages } from "../src/parsers/languages.js";
import { buildIndex } from "../src/parsers/normalizer.js";
import { parseSkills } from "../src/parsers/skills.js";
import {
  Basics,
  Certification,
  Education,
  Experience,
  Honor,
  Images,
  Language,
  Project,
  Publication,
  Skill,
  Volunteer,
} from "../src/schemas/profile.js";

async function loadFixture(name: string): Promise<unknown> {
  const raw = await readFile(path.join(import.meta.dirname, "fixtures", name), "utf8");
  return JSON.parse(raw);
}

function parseAll(payload: unknown) {
  const index = buildIndex(payload);
  return {
    basics: parseBasics(index),
    images: parseImages(index),
    experience: parseExperience(index),
    education: parseEducation(index),
    skills: parseSkills(index),
    certifications: parseCertifications(index),
    languages: parseLanguages(index),
    volunteer: parseVolunteer(index),
    honors: parseHonors(index),
    publications: parsePublications(index),
    projects: parseProjects(index),
  };
}

describe.each(["dense.json", "sparse.json", "locale-de.json"])("parsers against %s", (fixture) => {
  it("parses without throwing", async () => {
    const payload = await loadFixture(fixture);
    expect(() => parseAll(payload)).not.toThrow();
  });

  it("produces output that validates against the section schemas", async () => {
    const payload = await loadFixture(fixture);
    const result = parseAll(payload);
    expect(Basics.safeParse(result.basics).success).toBe(true);
    expect(Images.safeParse(result.images).success).toBe(true);
    expect(Experience.array().safeParse(result.experience).success).toBe(true);
    expect(Education.array().safeParse(result.education).success).toBe(true);
    expect(Skill.array().safeParse(result.skills).success).toBe(true);
    expect(Certification.array().safeParse(result.certifications).success).toBe(true);
    expect(Language.array().safeParse(result.languages).success).toBe(true);
    expect(Volunteer.array().safeParse(result.volunteer).success).toBe(true);
    expect(Honor.array().safeParse(result.honors).success).toBe(true);
    expect(Publication.array().safeParse(result.publications).success).toBe(true);
    expect(Project.array().safeParse(result.projects).success).toBe(true);
  });
});

describe("dense fixture", () => {
  it("yields non-empty experience, education, and skills", async () => {
    const result = parseAll(await loadFixture("dense.json"));
    expect(result.experience.length).toBeGreaterThan(0);
    expect(result.education.length).toBeGreaterThan(0);
    expect(result.skills.length).toBeGreaterThan(0);
  });

  it("computes isCurrent and durationMonths for open-ended positions", async () => {
    const result = parseAll(await loadFixture("dense.json"));
    const current = result.experience.find((e) => e.title === "Senior Backend Engineer");
    expect(current?.isCurrent).toBe(true);
    expect(current?.durationMonths).not.toBeNull();
  });

  it("computes durationMonths for closed positions from start/end", async () => {
    const result = parseAll(await loadFixture("dense.json"));
    const past = result.experience.find((e) => e.title === "Backend Engineer");
    expect(past?.isCurrent).toBe(false);
    // 2019-06 -> 2022-02 = 32 months
    expect(past?.durationMonths).toBe(32);
  });

  it("resolves company and school logos through URN references", async () => {
    const result = parseAll(await loadFixture("dense.json"));
    const acme = result.experience.find((e) => e.companyName === "Acme Corp");
    expect(acme?.companyLogoUrl).toContain("media.licdn.com");
    expect(acme?.companyLinkedinUrl).toBe("https://www.linkedin.com/company/acme-corp");
  });

  it("matches the full parsed shape", async () => {
    const result = parseAll(await loadFixture("dense.json"));
    expect(result).toMatchSnapshot();
  });
});

describe("sparse fixture", () => {
  it("yields empty arrays for absent sections without crashing", async () => {
    const result = parseAll(await loadFixture("sparse.json"));
    expect(result.experience).toEqual([]);
    expect(result.education).toEqual([]);
    expect(result.skills).toEqual([]);
    expect(result.certifications).toEqual([]);
    expect(result.languages).toEqual([]);
  });

  it("still parses basics", async () => {
    const result = parseAll(await loadFixture("sparse.json"));
    expect(result.basics.headline).toBe("Looking for opportunities");
    expect(result.basics.isOpenToWork).toBe(true);
  });
});

describe("locale-de fixture", () => {
  it("parses non-English content without crashing and preserves original-language strings", async () => {
    const result = parseAll(await loadFixture("locale-de.json"));
    expect(result.basics.headline).toContain("Softwareentwicklerin");
    expect(result.languages.map((l) => l.name)).toContain("Deutsch");
  });
});
