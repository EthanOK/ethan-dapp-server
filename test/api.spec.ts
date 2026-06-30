process.env.JWT_SECRET_KEY ??= "test-jwt-secret";
process.env.NODE_ENV ??= "production";

import { beforeAll, describe, expect, test } from "bun:test";
import { createDemoLoginPayload } from "../src/server/lib/demo-login";

const origin = "http://localhost:3000";

let app: Awaited<typeof import("../src/server/server")>["app"];

beforeAll(async () => {
  ({ app } = await import("../src/server/server"));
});

async function fetchApp(path: string, init?: RequestInit): Promise<Response> {
  return await app.fetch(new Request(`${origin}${path}`, init));
}

describe("API availability", () => {
  test("GET /api/hello", async () => {
    const res = await fetchApp("/api/hello");
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      message: "Hello, world!",
      method: "GET",
    });
  });

  test("GET /api/hello/{name}", async () => {
    const res = await fetchApp("/api/hello/world");
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      message: "Hello, world!",
    });
  });

  test("GET /api/openapi.json", async () => {
    const res = await fetchApp("/api/openapi.json");
    expect(res.status).toBe(200);

    const doc = await res.json();
    expect(doc.openapi).toBe("3.0.3");
    expect(doc.info?.title).toBe("Ethan DApp Server API");
    expect(doc.paths?.["/api/hello"]?.get).toBeDefined();
    expect(doc.paths?.["/api/login"]?.post).toBeDefined();
    expect(doc.servers?.[0]?.url).toBe(origin);
  });

  test("POST /api/login", async () => {
    const payload = await createDemoLoginPayload(origin);
    const res = await fetchApp("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(200);
    expect(typeof body.data?.userToken).toBe("string");
    expect(body.data.userToken.length).toBeGreaterThan(0);
  });

  test("GET /api/me with JWT", async () => {
    const payload = await createDemoLoginPayload(origin);
    const loginRes = await fetchApp("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const { data } = await loginRes.json();

    const res = await fetchApp("/api/me", {
      headers: { Authorization: `Bearer ${data.userToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(200);
    expect(body.data?.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  test("GET /api/me without token returns 401", async () => {
    const res = await fetchApp("/api/me");
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe(-401);
  });

  test("GET /swagger", async () => {
    const res = await fetchApp("/swagger");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/html/);

    const html = await res.text();
    expect(html).toContain('id="swagger-ui"');
    expect(html).toContain("/api/openapi.json");
  });
});
