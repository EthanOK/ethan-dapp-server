import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { serveStatic } from "hono/bun";
import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import type { Context } from "hono";
import type { AppEnv } from "./lib/app-env";
import { applyOpenApiPatches } from "./lib/openapi-patches";
import { registerAllRoutes } from "./routes";

const root = join(import.meta.dir, "../..");
const builtSwaggerPath = join(root, "public", "swagger.html");
const spaPath = join(root, "public", "index.html");

function requestOrigin(c: Context): string {
  const proto =
    c.req.header("x-forwarded-proto")?.split(",")[0]?.trim() ??
    new URL(c.req.url).protocol.replace(":", "");
  const host =
    c.req.header("x-forwarded-host")?.split(",")[0]?.trim() ??
    c.req.header("host") ??
    new URL(c.req.url).host;

  return `${proto}://${host}`;
}

const openApiInfo = {
  title: "Ethan DApp Server API",
  version: "1.0.0",
  description:
    "OpenAPI docs from Hono + Zod. Developer guide: see the develop/ directory in the repo.",
};

export const app = new OpenAPIHono<AppEnv>({
  defaultHook: (result, c) => {
    if (!result.success) {
      return c.json({ message: "Validation failed" }, 400);
    }
  },
});

app.use("/api/*", cors());

registerAllRoutes(app);

app.get("/api/openapi.json", async (c) => {
  const origin = requestOrigin(c);
  const doc = app.getOpenAPIDocument({
    openapi: "3.0.3",
    info: openApiInfo,
    servers: [{ url: origin }],
  });
  await applyOpenApiPatches(doc, origin);
  return c.json(doc);
});

const swaggerRelative = existsSync(builtSwaggerPath)
  ? "public/swagger.html"
  : "src/server/static/swagger.html";

app.get("/swagger", serveStatic({ root, path: swaggerRelative }));
app.get("/swagger.html", serveStatic({ root, path: swaggerRelative }));
app.get("/swagger/", (c) => c.redirect("/swagger"));

if (process.env.NODE_ENV === "production" && existsSync(spaPath)) {
  app.get("/", serveStatic({ root, path: "public/index.html" }));
  app.get("/*", (c) => {
    const path = c.req.path;
    if (path.startsWith("/api") || path.startsWith("/swagger")) {
      return c.notFound();
    }

    const relativePath = path.slice(1);
    const assetPath = join(root, "public", relativePath);
    if (relativePath && existsSync(assetPath) && statSync(assetPath).isFile()) {
      return new Response(Bun.file(assetPath));
    }

    return new Response(Bun.file(spaPath));
  });
}
