process.env.JWT_SECRET_KEY ??= "test-jwt-secret";
process.env.NODE_ENV ??= "production";
process.env.SWAGGER_PASSWORD = "test-swagger-secret";

import { afterAll, beforeAll, describe, expect, test } from "bun:test";

const origin = "http://localhost:3000";

let lastNotify: unknown = null;
let notifyResolve: (() => void) | null = null;
const notifyTarget = Bun.serve({
  port: 0,
  async fetch(req) {
    lastNotify = await req.json();
    notifyResolve?.();
    return new Response("ok");
  },
});
process.env.SWAGGER_AUTH_NOTIFY_URL = `http://localhost:${notifyTarget.port}`;

let app: Awaited<typeof import("../src/server/server")>["app"];

beforeAll(async () => {
  ({ app } = await import("../src/server/server"));
});

afterAll(() => {
  notifyTarget.stop(true);
});

async function fetchApp(path: string, init?: RequestInit): Promise<Response> {
  return await app.fetch(new Request(`${origin}${path}`, init), {
    SERVER: {
      requestIP: () => ({ address: "127.0.0.1", port: 3000 }),
    },
  });
}

function waitForNotify(timeoutMs = 2000): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Swagger auth notify timeout")),
      timeoutMs,
    );
    notifyResolve = () => {
      clearTimeout(timer);
      resolve(lastNotify);
    };
  });
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

  test("POST /api/swagger-auth success notifies server-side webhook URL", async () => {
    lastNotify = null;
    notifyResolve = null;

    const authRes = await fetchApp("/api/swagger-auth", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "cf-ipcountry": "US",
        "x-forwarded-for": "203.0.113.1, 10.0.0.1",
        "user-agent": "SwaggerGateTest/1.0",
        referer: "http://localhost:3000/swagger",
      },
      body: JSON.stringify({ password: "test-swagger-secret" }),
    });
    expect(authRes.status).toBe(200);

    const payload = (await waitForNotify()) as Record<string, unknown>;
    expect(payload.event).toBe("swagger_auth_success");
    expect(payload.ip).toBe("203.0.113.1");
    expect(payload.country).toBe("US");
    expect(payload.userAgent).toBe("SwaggerGateTest/1.0");
    expect(payload.referer).toBe("http://localhost:3000/swagger");
    expect(payload.host).toBe("localhost:3000");
    expect(typeof payload.timestamp).toBe("string");
    expect(typeof payload.content).toBe("string");
    expect(payload.content).toContain("203.0.113.1");
    expect(payload.content).toContain("Country: US");
  });

  test("POST /api/swagger-auth reports Local country for loopback IP", async () => {
    lastNotify = null;
    notifyResolve = null;

    const authRes = await fetchApp("/api/swagger-auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "test-swagger-secret" }),
    });
    expect(authRes.status).toBe(200);

    const payload = (await waitForNotify()) as Record<string, unknown>;
    expect(payload.country).toBe("Local");
    expect(payload.content).toContain("Country: Local");
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
