// Voyager endpoint paths and GraphQL queryId hashes.
//
// These are config, not business logic: LinkedIn changes them when it
// deploys, and none of the parsers should need to change when they do.
// `got`'s `prefixUrl` requires paths WITHOUT a leading slash.
//
// Verify these against a live session before relying on them — see
// docs/reverse-engineering.md for the capture procedure and the date
// each value below was last confirmed.

/**
 * Confirmed working 2026-08-28 against a live session. `profileView` (the
 * old REST endpoint this used to point at) now returns HTTP 410 Gone —
 * LinkedIn has retired it. This decorationId came from a third-party
 * reference implementation and was not independently captured from
 * DevTools; re-verify per docs/reverse-engineering.md if it starts 400ing.
 */
export const DECORATION_ID =
  "com.linkedin.voyager.dash.deco.identity.profile.FullProfileWithEntities-103";

/** GraphQL queryId for the profile-by-vanity-name query. Rotates with LinkedIn deploys. */
export const QUERY_ID = "voyagerIdentityDashProfiles.abcdef1234567890abcdef1234567890";

export const ENDPOINTS = {
  /**
   * Older REST-style endpoint. Confirmed dead (HTTP 410 Gone) as of
   * 2026-08-28 — LinkedIn has retired it. Kept only for reference; do not
   * use as the primary fetch path.
   */
  profileView: (vanity: string) => `voyager/api/identity/profiles/${vanity}/profileView`,

  /** Primary endpoint. Confirmed working as of 2026-08-28. */
  dashProfile: (vanity: string) =>
    `voyager/api/identity/dash/profiles?q=memberIdentity&memberIdentity=${vanity}&decorationId=${DECORATION_ID}`,

  /** GraphQL fallback. `queryId` is a placeholder — recapture per docs/reverse-engineering.md before relying on it. */
  graphql: (vanity: string) =>
    `voyager/api/graphql?variables=(vanityName:${vanity})&queryId=${QUERY_ID}`,
} as const;

export type EndpointName = keyof typeof ENDPOINTS;
