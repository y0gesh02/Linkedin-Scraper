import { z } from "zod";

export const ErrorResponse = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    detail: z.string().nullable(),
  }),
  requestId: z.string(),
});

export type ErrorResponse = z.infer<typeof ErrorResponse>;

export const HealthResponse = z.object({
  status: z.enum(["ok"]),
  sessionValid: z.boolean(),
  version: z.string(),
});

export type HealthResponse = z.infer<typeof HealthResponse>;
