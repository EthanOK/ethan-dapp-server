import type { OpenAPIHono } from "@hono/zod-openapi";
import type { AppEnv } from "./app-env";

export const BEARER_SECURITY_SCHEME = "Bearer";

export function registerOpenApiSecurity(app: OpenAPIHono<AppEnv>): void {
  app.openAPIRegistry.registerComponent(
    "securitySchemes",
    BEARER_SECURITY_SCHEME,
    {
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
      description:
        "Paste the userToken from POST /api/login. Do not add a Bearer prefix in Swagger (it is added automatically). If you include Bearer by mistake, the server still accepts it.",
    },
  );
}
