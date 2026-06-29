import { app } from "./server";

const port = Number(process.env.PORT ?? 3000);

export default {
  port,
  fetch: app.fetch,
  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
};

console.log(`🚀 Server running at http://localhost:${port}`);
console.log(`   Swagger UI:   http://localhost:${port}/swagger`);
console.log(`   OpenAPI:      http://localhost:${port}/api/openapi.json`);
