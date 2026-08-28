import type { z } from "zod";
import type { Cache } from "../cache.js";
import { DEFAULT_CACHE_TTL_SECONDS } from "../config/constants.js";
import { ENDPOINTS } from "../config/endpoints.js";
import { SessionUnavailableError } from "../errors.js";
import type { VoyagerClient } from "../linkedin/client.js";
import type { LinkedInSession } from "../linkedin/session.js";
import { extractVanity } from "../linkedin/urls.js";
import { parseBasics, parseImages } from "../parsers/basics.js";
import { parseCertifications } from "../parsers/certifications.js";
import { parseEducation } from "../parsers/education.js";
import { parseExperience } from "../parsers/experience.js";
import {
  parseHonors,
  parseProjects,
  parsePublications,
  parseVolunteer,
} from "../parsers/extras.js";
import { parseLanguages } from "../parsers/languages.js";
import {
  type UrnIndex,
  buildIndex,
  byType,
  getPath,
} from "../parsers/normalizer.js";
import { parseSkills } from "../parsers/skills.js";
import {
  Basics,
  Certification,
  Education,
  Experience,
  Honor,
  Images,
  Language,
  type ProfileResponse,
  Project,
  Publication,
  Skill,
  Volunteer,
} from "../schemas/profile.js";

const CACHE_VERSION = "v1";

const EMPTY_BASICS: z.infer<typeof Basics> = {
  firstName: null,
  lastName: null,
  fullName: null,
  headline: null,
  summary: null,
  location: null,
  industry: null,
  pronouns: null,
  followerCount: null,
  connectionCount: null,
  isPremium: null,
  isInfluencer: null,
  isOpenToWork: null,
};

const EMPTY_IMAGES: z.infer<typeof Images> = {
  profilePicture: null,
  backgroundImage: null,
};

export interface ProfileServiceDeps {
  cache: Cache;
  client: VoyagerClient;
  session: LinkedInSession;
}

export interface FetchProfileOptions {
  refresh?: boolean;
}

function cacheKeyFor(vanity: string): string {
  return `profile:${CACHE_VERSION}:${vanity}`;
}

/** Runs a section parser and validates its output; a failure degrades only that section. */
function parseSection<S extends z.ZodTypeAny>(
  name: string,
  schema: S,
  run: () => unknown,
  fallback: z.infer<S>,
  sectionsParsed: string[],
  sectionsFailed: string[],
  parseWarnings: string[],
): z.infer<S> {
  try {
    const raw = run();
    const result = schema.safeParse(raw);
    if (!result.success) {
      sectionsFailed.push(name);
      parseWarnings.push(
        `${name}: ${result.error.issues.map((i) => i.message).join("; ")}`,
      );
      return fallback;
    }
    sectionsParsed.push(name);
    return result.data;
  } catch (err) {
    sectionsFailed.push(name);
    parseWarnings.push(
      `${name}: ${err instanceof Error ? err.message : String(err)}`,
    );
    return fallback;
  }
}

function findProfileUrn(index: UrnIndex): string | null {
  const profile = byType(index, "profile.Profile")[0];
  return getPath<string>(profile, "entityUrn") ?? null;
}

export async function fetchProfile(
  deps: ProfileServiceDeps,
  url: string,
  options: FetchProfileOptions = {},
): Promise<ProfileResponse> {
  const vanity = extractVanity(url);
  const cacheKey = cacheKeyFor(vanity);

  if (!options.refresh) {
    const cached = await deps.cache.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as ProfileResponse;
      return { ...parsed, cached: true };
    }
  }

  if (!deps.session.isLoaded) {
    throw new SessionUnavailableError();
  }

  const raw = await deps.client.fetchVoyager(ENDPOINTS.dashProfile(vanity));
  const index = buildIndex(raw);

  const sectionsParsed: string[] = [];
  const sectionsFailed: string[] = [];
  const parseWarnings: string[] = [];

  const section = <S extends z.ZodTypeAny>(
    name: string,
    schema: S,
    run: () => unknown,
    fallback: z.infer<S>,
  ) =>
    parseSection(
      name,
      schema,
      run,
      fallback,
      sectionsParsed,
      sectionsFailed,
      parseWarnings,
    );

  const basics = section(
    "basics",
    Basics,
    () => parseBasics(index),
    EMPTY_BASICS,
  );
  const images = section(
    "images",
    Images,
    () => parseImages(index),
    EMPTY_IMAGES,
  );
  const experience = section(
    "experience",
    Experience.array(),
    () => parseExperience(index),
    [] as z.infer<typeof Experience>[],
  );
  const education = section(
    "education",
    Education.array(),
    () => parseEducation(index),
    [] as z.infer<typeof Education>[],
  );
  const skills = section(
    "skills",
    Skill.array(),
    () => parseSkills(index),
    [] as z.infer<typeof Skill>[],
  );
  const certifications = section(
    "certifications",
    Certification.array(),
    () => parseCertifications(index),
    [] as z.infer<typeof Certification>[],
  );
  const languages = section(
    "languages",
    Language.array(),
    () => parseLanguages(index),
    [] as z.infer<typeof Language>[],
  );
  const volunteer = section(
    "volunteer",
    Volunteer.array(),
    () => parseVolunteer(index),
    [] as z.infer<typeof Volunteer>[],
  );
  const honors = section(
    "honors",
    Honor.array(),
    () => parseHonors(index),
    [] as z.infer<typeof Honor>[],
  );
  const publications = section(
    "publications",
    Publication.array(),
    () => parsePublications(index),
    [] as z.infer<typeof Publication>[],
  );
  const projects = section(
    "projects",
    Project.array(),
    () => parseProjects(index),
    [] as z.infer<typeof Project>[],
  );

  const response: ProfileResponse = {
    profileUrl: url,
    publicIdentifier: vanity,
    urn: findProfileUrn(index),
    fetchedAt: new Date().toISOString(),
    cached: false,
    basics,
    images,
    experience,
    education,
    skills,
    certifications,
    languages,
    volunteer,
    honors,
    publications,
    projects,
    meta: {
      sectionsParsed,
      sectionsFailed,
      sourceEndpoint: "dashProfile",
      parseWarnings,
    },
  };

  await deps.cache.set(
    cacheKey,
    JSON.stringify(response),
    DEFAULT_CACHE_TTL_SECONDS,
  );

  return response;
}
