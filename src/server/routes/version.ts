import { join } from "node:path";
import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";
import type { AppEnv } from "../lib/app-env";

const root = join(import.meta.dir, "../../..");
const pkg = (await Bun.file(join(root, "package.json")).json()) as {
  version: string;
};

const VersionResponseSchema = z
  .object({
    version: z.string().openapi({ example: "0.1.0" }),
  })
  .openapi("VersionResponse");

const versionRoute = createRoute({
  method: "get",
  path: "/api/version",
  tags: ["System"],
  summary: "Application version",
  description: "Returns the package version from package.json",
  responses: {
    200: {
      description: "Current application version",
      content: {
        "application/json": {
          schema: VersionResponseSchema,
        },
      },
    },
  },
});

export function registerVersionRoutes(app: OpenAPIHono<AppEnv>) {
  app.openapi(versionRoute, (c) => c.json({ version: pkg.version }));
}
