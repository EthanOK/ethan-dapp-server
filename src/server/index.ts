import clientIndex from "../client/index.html";
import { app } from "./server";

const isDev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT ?? 3000);

Bun.serve({
  port,
  routes: isDev ? { "/": clientIndex } : undefined,
  fetch: app.fetch,
  development: isDev && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at http://localhost:${port}`);
console.log(`   Home:         http://localhost:${port}/`);
console.log(`   Swagger UI:   http://localhost:${port}/swagger`);
console.log(`   OpenAPI:      http://localhost:${port}/api/openapi.json`);
