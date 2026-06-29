import { serveStatic } from "hono/bun";
import { OpenAPIHono } from "@hono/zod-openapi";
import { registerHelloRoutes } from "./routes/hello";
import { registerLoginRoutes } from "./routes/login";

const isProd = process.env.NODE_ENV === "production";

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

registerHelloRoutes(app);
registerLoginRoutes(app);

app.get("/api/openapi.json", (c) =>
  c.json(
    app.getOpenAPIDocument({
      openapi: "3.0.3",
      info: openApiInfo,
      servers: [{ url: new URL(c.req.url).origin }],
    }),
  ),
);

app.get("/", (c) => c.redirect("/swagger"));

app.get(
  "/swagger",
  serveStatic({
    path: isProd ? "./dist/swagger.html" : "./src/docs.html",
  }),
);

app.get(
  "/*",
  serveStatic({
    path: "./dist/index.html",
  }),
);
