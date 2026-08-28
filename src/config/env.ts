import { z } from "zod";

// .env.example ships optional vars as empty strings (per guardrail #2 in
// CLAUDE.md — no secrets, but a visible placeholder). Zod's `.optional()`
// only treats `undefined` as absent, not `""`, so `.url()` would otherwise
// reject a deliberately-blank REDIS_URL. Normalize first.
function emptyToUndefined(value: unknown): unknown {
  return value === "" ? undefined : value;
}

const optionalString = () =>
  z.preprocess(emptyToUndefined, z.string().optional());
const optionalUrl = () =>
  z.preprocess(emptyToUndefined, z.string().url().optional());

const EnvSchema = z.object({
  LI_AT: optionalString(),
  JSESSIONID: optionalString(),
  API_KEY: optionalString(),
  REDIS_URL: optionalUrl(),
});

export type Env = z.infer<typeof EnvSchema>;

export const env: Env = EnvSchema.parse(process.env);
