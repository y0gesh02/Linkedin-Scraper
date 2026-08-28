import { InvalidProfileUrlError } from "../errors.js";

const NON_PROFILE_PATH_PREFIXES = new Set([
  "company",
  "school",
  "jobs",
  "groups",
  "showcase",
  "learning",
  "feed",
  "messaging",
  "notifications",
  "search",
]);

/**
 * Extracts the vanity name (public identifier) from any LinkedIn profile URL
 * variant, or throws InvalidProfileUrlError with a message useful enough to
 * return straight to an API caller.
 */
export function extractVanity(input: string): string {
  if (!input || typeof input !== "string" || input.trim().length === 0) {
    throw new InvalidProfileUrlError("URL is required");
  }

  const trimmed = input.trim();
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new InvalidProfileUrlError(`'${input}' is not a valid URL`);
  }

  const host = url.hostname.toLowerCase();
  if (!host.endsWith("linkedin.com")) {
    throw new InvalidProfileUrlError(`'${input}' is not a linkedin.com URL`, host);
  }

  const segments = url.pathname.split("/").filter((segment) => segment.length > 0);

  if (segments.length === 0) {
    throw new InvalidProfileUrlError(`'${input}' has no profile path`);
  }

  const [first, second, third] = segments;

  // Legacy format: /pub/<vanity>/<a>/<b>/<c>
  if (first === "pub" && second) {
    return decodeVanity(second, input);
  }

  if (first !== "in") {
    if (first && NON_PROFILE_PATH_PREFIXES.has(first)) {
      throw new InvalidProfileUrlError(
        `'${input}' points to a '${first}' page, not a profile`,
        first,
      );
    }
    throw new InvalidProfileUrlError(`'${input}' is not a recognized LinkedIn profile URL`);
  }

  if (!second) {
    throw new InvalidProfileUrlError(`'${input}' is missing a profile vanity name`);
  }

  // /in/<vanity>/details/experience/ — drop everything after the vanity segment.
  void third;

  return decodeVanity(second, input);
}

function decodeVanity(segment: string, original: string): string {
  let decoded: string;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    throw new InvalidProfileUrlError(`'${original}' has an invalid encoded vanity name`);
  }

  if (decoded.length === 0) {
    throw new InvalidProfileUrlError(`'${original}' is missing a profile vanity name`);
  }

  return decoded;
}
