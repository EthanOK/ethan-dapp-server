import type { OpenAPIHono } from "@hono/zod-openapi";
import type { AppEnv } from "../lib/app-env";
import { registerOpenApiSecurity } from "../lib/openapi-security";
import { registerHealthRoutes } from "./health";
import { registerHelloRoutes } from "./hello";
import { registerLoginRoutes } from "./login";
import { registerMeRoutes } from "./me";
import { registerWebhookRoutes } from "./webhooks";

export function registerAllRoutes(app: OpenAPIHono<AppEnv>): void {
  registerOpenApiSecurity(app);
  registerHealthRoutes(app);
  registerHelloRoutes(app);
  registerLoginRoutes(app);
  registerMeRoutes(app);
  registerWebhookRoutes(app);
}
