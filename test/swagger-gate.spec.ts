process.env.JWT_SECRET_KEY ??= "test-jwt-secret";
process.env.NODE_ENV ??= "production";
process.env.SWAGGER_PASSWORD = "test-swagger-secret";

import { beforeAll, describe, expect, test } from "bun:test";

const origin = "http://localhost:3000";

let app: Awaited<typeof import("../src/server/server")>["app"];

beforeAll(async () => {
  ({ app } = await import("../src/server/server"));
});

async function fetchApp(path: string, init?: RequestInit): Promise<Response> {
  return await app.fetch(new Request(`${origin}${path}`, init));
}

describe("swagger password gate", () => {
  test("GET /swagger without auth shows password gate", async () => {
    const res = await fetchApp("/swagger");
    expect(res.status).toBe(200);

    const html = await res.text();
    expect(html).toContain("Enter your password");
    expect(html).not.toContain('id="swagger-ui"');
  });

  test("GET /api/openapi.json stays public without swagger auth", async () => {
    const res = await fetchApp("/api/openapi.json");
    expect(res.status).toBe(200);
    const doc = await res.json();
    expect(doc.openapi).toBe("3.0.3");
  });

  test("POST /api/swagger-auth with wrong password returns 401", async () => {
    const res = await fetchApp("/api/swagger-auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "wrong" }),
    });
    expect(res.status).toBe(401);
  });

  test("authenticated swagger flow grants access to /swagger only", async () => {
    const authRes = await fetchApp("/api/swagger-auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "test-swagger-secret" }),
    });
    expect(authRes.status).toBe(200);

    const cookie = authRes.headers.get("set-cookie");
    expect(cookie).toContain("swagger_access=");

    const swaggerRes = await fetchApp("/swagger", {
      headers: { cookie: cookie ?? "" },
    });
    expect(swaggerRes.status).toBe(200);
    const html = await swaggerRes.text();
    expect(html).toContain('id="swagger-ui"');
  });
});
