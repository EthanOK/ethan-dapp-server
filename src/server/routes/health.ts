import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";
import type { AppEnv } from "../lib/app-env";

const HealthResponseSchema = z
  .object({
    status: z.literal("ok").openapi({ example: "ok" }),
    uptime: z
      .number()
      .openapi({ example: 12.34, description: "Process uptime in seconds" }),
    timestamp: z
      .string()
      .openapi({ example: "2026-06-30T09:24:00.000Z" }),
  })
  .openapi("HealthResponse");

const healthRoute = createRoute({
  method: "get",
  path: "/api/health",
  tags: ["System"],
  summary: "Health check",
  description: "Liveness probe for load balancers and uptime monitors",
  responses: {
    200: {
      description: "Service is healthy",
      content: {
        "application/json": {
          schema: HealthResponseSchema,
        },
      },
    },
  },
});

export function registerHealthRoutes(app: OpenAPIHono<AppEnv>) {
  app.openapi(healthRoute, (c) =>
    c.json({
      status: "ok" as const,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    }),
  );
}
