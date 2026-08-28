import fastifySwagger from "@fastify/swagger";
import apiReference from "@scalar/fastify-api-reference";
import Fastify, { type FastifyError, type FastifyInstance } from "fastify";
import {
  type ZodTypeProvider,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { AppError } from "./errors.js";
import authPlugin from "./plugins/auth.js";
import linkedinPlugin from "./plugins/linkedin.js";
import redisPlugin from "./plugins/redis.js";
import healthRoute from "./routes/health.js";
import homeRoute from "./routes/home.js";
import profileRoute from "./routes/profile.js";

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === "test" ? "silent" : "info",
      transport:
        process.env.NODE_ENV === "development" || !process.env.NODE_ENV
          ? { target: "pino-pretty" }
          : undefined,
    },
  }).withTypeProvider<ZodTypeProvider>();

  // Schema compilers must be registered before any routes, or Zod schemas
  // are silently ignored for validation/serialization.
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.setErrorHandler((error: FastifyError | AppError, request, reply) => {
    if (error instanceof AppError) {
      request.log.warn({ err: error, code: error.code }, error.message);
      return reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          detail: error.detail ?? null,
        },
        requestId: request.id,
      });
    }

    // Fastify validation errors carry a `validation` array and statusCode 400.
    if (error.validation) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: error.message,
          detail: null,
        },
        requestId: request.id,
      });
    }

    request.log.error({ err: error }, "unhandled error");
    const statusCode = error.statusCode ?? 500;
    return reply.status(statusCode).send({
      error: {
        code: "INTERNAL_ERROR",
        message: statusCode === 500 ? "Internal server error" : error.message,
        detail: null,
      },
      requestId: request.id,
    });
  });

  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: "LinkedIn Profile API",
        description:
          "Accepts a LinkedIn profile URL and returns the profile's public-facing content as structured JSON.",
        version: "1.0.0",
      },
      components: {
        securitySchemes: {
          apiKey: { type: "apiKey", name: "X-API-Key", in: "header" },
        },
      },
    },
    transform: jsonSchemaTransform,
  });

  await app.register(apiReference, {
    routePrefix: "/docs",
    configuration: { spec: { url: "/documentation/json" } },
  });

  await app.register(redisPlugin);
  await app.register(linkedinPlugin);
  await app.register(authPlugin);

  await app.register(homeRoute);
  await app.register(healthRoute);
  await app.register(profileRoute, { prefix: "/api/v1" });

  return app;
}
