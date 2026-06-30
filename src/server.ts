import { existsSync } from "node:fs";
import { join } from "node:path";
import { serveStatic } from "hono/bun";
import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import type { Context } from "hono";
import { registerHelloRoutes } from "./routes/hello";
import { patchOpenApiLoginExample, registerLoginRoutes } from "./routes/login";

const root = join(import.meta.dir, "..");
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
  title: "Ethan DApp API",
  version: "1.0.0",
  description:
    "OpenAPI docs from Hono + Zod. Developer guide: see the develop/ directory in the repo.",
};

export const app = new OpenAPIHono({
  defaultHook: (result, c) => {
    if (!result.success) {
      return c.json({ message: "Validation failed" }, 400);
    }
  },
});

app.use("/api/*", cors());

registerHelloRoutes(app);
registerLoginRoutes(app);

app.get("/api/openapi.json", async (c) => {
  const origin = requestOrigin(c);
  const doc = app.getOpenAPIDocument({
    openapi: "3.0.3",
    info: openApiInfo,
    servers: [{ url: origin }],
  });
  await patchOpenApiLoginExample(doc, origin);
  return c.json(doc);
});

app.get("/", (c) => c.redirect("/swagger"));

const swaggerRelative = existsSync(builtSwaggerPath)
  ? "public/swagger.html"
  : "src/docs.html";

app.get("/swagger", serveStatic({ root, path: swaggerRelative }));
app.get("/swagger.html", serveStatic({ root, path: swaggerRelative }));

if (existsSync(spaPath)) {
  app.get("/*", serveStatic({ root, path: "public/index.html" }));
}
