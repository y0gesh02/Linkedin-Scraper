import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { HealthResponse } from "../schemas/error.js";

const VERSION = "1.0.0";

export default async function healthRoute(fastify: FastifyInstance) {
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/health",
    schema: {
      description: "Liveness and session-status check. Never requires auth.",
      tags: ["health"],
      response: { 200: HealthResponse },
    },
    handler: async () => {
      const sessionValid = fastify.linkedin.session.isLoaded;
      return { status: "ok" as const, sessionValid, version: VERSION };
    },
  });
}
