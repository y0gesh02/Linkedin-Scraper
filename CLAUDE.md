# Agent guardrails for this repo

Hard constraints, not preferences. See `IMPLEMENTATION_PLAN.md` for the full build plan.

1. **No browser automation anywhere in the runtime path.** No `playwright`, `puppeteer`, `selenium-webdriver`, or any headless-browser package. This is a pure reverse-engineered HTTP client.
2. **Never commit secrets.** No cookies, passwords, tokens, or session values in source, tests, fixtures, or commit history. `.env` is gitignored. `.env.example` ships with empty values.
3. **Fixtures must be redacted.** Anything under `tests/fixtures/` must be synthesized to a redacted shape — real member URNs, emails, and phone numbers never go in.
4. **Never hit LinkedIn during tests.** All tests run offline against fixtures with MSW intercepting HTTP. CI has no network access and no credentials. Note: `got`'s HTTP/2 mode bypasses Node's `http`/`https` modules (what MSW patches) — do not re-enable `http2: true` in `src/linkedin/client.ts` without also fixing test interception.
5. **Endpoint paths and `queryId` hashes are config, not business-logic constants.** They live in `src/config/endpoints.ts`. They rot when LinkedIn deploys; update them there, not in parsers.
6. **Parsers are pure functions.** `(index: UrnIndex) => Model`. No I/O, no network, no module-level state.
7. **Partial success beats total failure.** A section that fails to parse or fails Zod validation degrades into an empty value plus an entry in `meta.sectionsFailed`, never a 500 for the whole request.
8. **`strict: true`, no `any` in `src/`.** Raw LinkedIn payloads are `unknown`, narrowed through `getPath` (`src/parsers/normalizer.ts`) and validated with Zod `.safeParse()` at each section boundary.

## Known gaps from this build

- `tests/fixtures/*.json` are **synthetic**, hand-built to match the documented normalized Voyager shape — not real captures. Before trusting this against production LinkedIn traffic, capture a real response (e.g. by temporarily logging the raw payload in `profileService.ts`, or replaying a DevTools-captured request) against a real throwaway account, redact it by hand, and diff the shape against the parsers.
- `src/config/endpoints.ts`'s `profileView` endpoint is **confirmed dead** (returns `HTTP 410 Gone` as of 2026-08-28, tested against a real session). The service now calls `dashProfile` instead. `dashProfile`'s `decorationId` came from a third-party reference implementation, not an independent DevTools capture — treat as likely-correct-but-unverified.
- `src/config/endpoints.ts`'s GraphQL `queryId` is a placeholder and unused by the service. It must be replaced with a value captured from a live session before the GraphQL fallback path is used.
- `docs/reverse-engineering.md`'s cURL capture is still a template (updated to target `dashProfile`, but not independently re-verified header-by-header against that specific endpoint). Re-verify the minimum header set against a real session.
- The `dashProfile` payload's actual field names/entity types have not been confirmed against a real capture — only the endpoint URL and status code were tested live. If a real fetch returns 200 but sections come back empty, the parsers in `src/parsers/*.ts` likely need adjusting to match the real shape.
