process.env.JWT_SECRET_KEY ??= "test-jwt-secret";
process.env.NODE_ENV ??= "production";

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createDemoLoginPayload } from "../src/server/lib/demo-login";

const origin = "http://localhost:3000";

// Local target that the "discord" destination should forward to.
let lastForwarded: unknown = null;
let lastForwardedHeaders: Headers | null = null;
let targetStatusToReturn = 200;
const forwardTarget = Bun.serve({
  port: 0,
  async fetch(req) {
    lastForwardedHeaders = req.headers;
    lastForwarded = await req.json();
    return new Response(JSON.stringify({ ok: targetStatusToReturn < 400 }), {
      status: targetStatusToReturn,
      headers: { "content-type": "application/json" },
    });
  },
});
process.env.WEBHOOK_DISCORD_URL = `http://localhost:${forwardTarget.port}`;

let app: Awaited<typeof import("../src/server/server")>["app"];

beforeAll(async () => {
  ({ app } = await import("../src/server/server"));
});

afterAll(() => {
  forwardTarget.stop(true);
});

async function fetchApp(path: string, init?: RequestInit): Promise<Response> {
  return await app.fetch(new Request(`${origin}${path}`, init));
}

async function getUserToken(): Promise<string> {
  const payload = await createDemoLoginPayload(origin);
  const res = await fetchApp("/api/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const { data } = await res.json();
  return data.userToken as string;
}

describe("API availability", () => {
  test("GET /api/health", async () => {
    const res = await fetchApp("/api/health");
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(typeof body.uptime).toBe("number");
    expect(body.uptime).toBeGreaterThanOrEqual(0);
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
  });

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

  test("POST /api/webhooks without token returns 401", async () => {
    const res = await fetchApp("/api/webhooks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ destination: "discord", content: "hi" }),
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe(-401);
  });

  test("POST /api/webhooks routes by destination and forwards payload", async () => {
    const token = await getUserToken();

    const res = await fetchApp("/api/webhooks", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-Webhook-Event": "ping",
      },
      body: JSON.stringify({ destination: "discord", content: "Hello" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(200);
    expect(body.data?.forwarded).toBe(true);
    expect(body.data?.destination).toBe("discord");
    expect(body.data?.targetStatus).toBe(200);

    // `destination` is stripped; remaining payload is forwarded.
    expect(lastForwarded).toEqual({ content: "Hello" });

    // Upstream custom header is relayed; our JWT Authorization is stripped.
    expect(lastForwardedHeaders?.get("x-webhook-event")).toBe("ping");
    expect(lastForwardedHeaders?.get("authorization")).toBeNull();
  });

  test("POST /api/webhooks returns 502 when target responds non-2xx", async () => {
    const token = await getUserToken();
    targetStatusToReturn = 500;
    try {
      const res = await fetchApp("/api/webhooks", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ destination: "discord", content: "x" }),
      });

      expect(res.status).toBe(502);
      const body = await res.json();
      expect(body.code).toBe(502);
      expect(body.targetStatus).toBe(500);
    } finally {
      targetStatusToReturn = 200;
    }
  });

  test("POST /api/webhooks unknown destination returns 400", async () => {
    const token = await getUserToken();

    const res = await fetchApp("/api/webhooks", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ destination: "nope", content: "x" }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe(-400);
  });
});
