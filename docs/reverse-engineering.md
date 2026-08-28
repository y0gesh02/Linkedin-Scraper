# Reverse engineering notes

This documents the procedure used to find the minimum viable request against
LinkedIn's internal Voyager API, per `IMPLEMENTATION_PLAN.md` section 5.

**Status:** this repo was originally built in an environment with no LinkedIn
account access, so the endpoint and cURL capture below started as a
reconstructed template. It has since been partially corrected against a real
session: `profileView`, the endpoint this project originally called first, was
found to return `HTTP 410 Gone` — LinkedIn has retired it. The service now
calls `dashProfile` instead (see "Endpoint and queryId status" below). The
`decorationId` currently in use came from a third-party reference
implementation, not an independent DevTools capture, and the GraphQL fallback
path is still entirely unverified. Both should be re-confirmed by running the
procedure below directly.

## Procedure

1. Log into LinkedIn with a throwaway account in a fresh/private browser profile.
2. Open DevTools → Network, filter on `voyager`, enable "preserve log".
3. Load a profile page, then expand About, Experience, and Skills — several
   sections lazy-load on scroll/click as separate requests you'll otherwise miss.
4. Find the request returning the most profile content — currently that's a
   `dash/profiles?q=memberIdentity` request, not `profileView` (see below).
   Right-click → Copy → Copy as cURL.
5. Reproduce it in a terminal and confirm you get JSON back, not HTML.
6. Delete headers one at a time and re-run to find the minimum viable set,
   rather than shipping all forty and hoping.
7. Save the working cURL here with cookie values redacted.
8. If a GraphQL endpoint is used, record the `queryId` hash and the capture date.

## Minimum viable request (template — cookies redacted)

```bash
curl 'https://www.linkedin.com/voyager/api/identity/dash/profiles?q=memberIdentity&memberIdentity=<vanity>&decorationId=com.linkedin.voyager.dash.deco.identity.profile.FullProfileWithEntities-103' \
  -H 'accept: application/vnd.linkedin.normalized+json+2.1' \
  -H 'cookie: li_at=<REDACTED>; JSESSIONID="ajax:<REDACTED>"' \
  -H 'csrf-token: ajax:<REDACTED>' \
  -H 'x-restli-protocol-version: 2.0.0' \
  -H 'x-li-lang: en_US' \
  -H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' \
  -H 'referer: https://www.linkedin.com/feed/'
```

This is still a template with a third-party-sourced `decorationId`, not an
independent DevTools capture — the header set has not been re-verified
against this specific endpoint by deleting headers one at a time as step 6
describes. Do that before treating this as final.

## Header-by-header findings

| Header                        | Required? | Notes                                                                                |
| ------------------------------ | --------- | ------------------------------------------------------------------------------------- |
| `cookie` (`li_at`, `JSESSIONID`) | Yes       | The session itself. Without it: redirect to `/authwall`.                              |
| `csrf-token`                    | Yes       | Must equal `JSESSIONID` with surrounding quotes stripped. Wrong value → 403.           |
| `accept: application/vnd.linkedin.normalized+json+2.1` | Yes | Without it, LinkedIn returns deeply nested Rest.li objects instead of flat `included[]`. |
| `x-restli-protocol-version: 2.0.0` | Yes  | Rest.li protocol version LinkedIn expects for this endpoint shape.                     |
| `referer`                       | Recommended | Some endpoints 403 without a same-origin referer.                                   |
| `user-agent`                    | Recommended | Generic/absent UAs are more likely to be challenged.                                |
| `x-li-lang`, `accept-language`  | Optional  | Affects localization of returned label strings, not access.                          |
| Most other `x-li-*` telemetry headers | No | Removable without affecting the response in ad hoc testing.                          |

## Endpoint and queryId status

- `profileView` (`voyager/api/identity/profiles/{vanity}/profileView`):
  **confirmed dead as of 2026-08-28** — returns `HTTP 410 Gone` against a real
  session. No longer called by the service; kept in `src/config/endpoints.ts`
  only as a documented dead reference.
- `dashProfile` (`voyager/api/identity/dash/profiles?q=memberIdentity&...`):
  **primary endpoint, confirmed working as of 2026-08-28.** Its `decorationId`
  (`com.linkedin.voyager.dash.deco.identity.profile.FullProfileWithEntities-103`)
  came from a third-party reference implementation rather than an independent
  capture — treat it as likely-correct-but-unverified, and expect it to rot
  like any other decoration id.
- GraphQL fallback (`src/config/endpoints.ts`): the `queryId` is a placeholder
  and has never been used against a live session. Not currently called by the
  service at all — `dashProfile` is the only path in use.

## Open question: does the actual `dashProfile` payload match the parsers?

The parsers in `src/parsers/*.ts` and the fixtures in `tests/fixtures/*.json`
were built against a *guessed* normalized shape (entity `$type` suffixes like
`profile.Position`, fields like `geoLocationName`, `dateRange.start.month`),
not a real captured `dashProfile` response. Endpoint correctness and payload
shape are two separate risks — fixing the 410 only addresses the first. If a
live `dashProfile` call returns 200 but sections come back empty/null that
you know the profile has, temporarily log the raw response body in
`profileService.ts` (or inspect it via the DevTools Network tab per the
procedure above) and compare its entity shapes against what `src/parsers/`
expects. Redact any real member data (names, URNs, images) by hand before
it goes anywhere near `tests/fixtures/`.
