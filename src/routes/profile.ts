import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { requireApiKey } from "../plugins/auth.js";
import { ErrorResponse } from "../schemas/error.js";
import { ProfileRequestBody, ProfileResponse } from "../schemas/profile.js";
import { fetchProfile } from "../services/profileService.js";

const ERROR_RESPONSES = {
  400: ErrorResponse,
  401: ErrorResponse,
  403: ErrorResponse,
  404: ErrorResponse,
  429: ErrorResponse,
  502: ErrorResponse,
  503: ErrorResponse,
} as const;

export default async function profileRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.route({
    method: "POST",
    url: "/profile",
    preHandler: requireApiKey,
    schema: {
      description: "Fetch a LinkedIn profile by URL (body form).",
      tags: ["profile"],
      security: [{ apiKey: [] }],
      body: ProfileRequestBody,
      response: { 200: ProfileResponse, ...ERROR_RESPONSES },
    },
    handler: async (request) => {
      const { url, refresh } = request.body;
      return fetchProfile(
        {
          cache: fastify.cache,
          client: fastify.linkedin.client,
          session: fastify.linkedin.session,
        },
        url,
        { refresh },
      );
    },
  });
}
