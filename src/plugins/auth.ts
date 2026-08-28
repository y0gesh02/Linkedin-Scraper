import { timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { env } from "../config/env.js";
import { UnauthorizedError } from "../errors.js";

/** preHandler for routes that require an API key. A no-op (open access) if API_KEY is unset. */
export async function requireApiKey(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  if (!env.API_KEY) return;

  const provided = request.headers["x-api-key"];
  if (typeof provided !== "string" || !safeEqual(provided, env.API_KEY)) {
    throw new UnauthorizedError();
  }
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // timingSafeEqual throws on a length mismatch, so compare lengths first —
  // otherwise a mismatched key length produces a 500 instead of a 401.
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export default fp(async (fastify) => {
  if (!env.API_KEY) {
    fastify.log.warn(
      "API_KEY is not set — the API is open to any caller. Do not deploy like this.",
    );
  }
});
