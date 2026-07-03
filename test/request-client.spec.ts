import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import type { AppEnv } from "../src/server/lib/app-env";
import { clientIpFromRequest } from "../src/server/lib/request-client";

function createContext(
  init: RequestInit & { url?: string },
  server?: AppEnv["Bindings"]["SERVER"],
) {
  const app = new Hono<AppEnv>();
  let capturedIp = "";

  app.get("/test", (c) => {
    capturedIp = clientIpFromRequest(c);
    return c.text("ok");
  });

  const req = new Request(init.url ?? "http://localhost:3000/test", init);
  return {
    async run() {
      await app.fetch(req, server ? { SERVER: server } : undefined);
      return capturedIp;
    },
  };
}

describe("clientIpFromRequest", () => {
  test("prefers X-Forwarded-For over socket IP", async () => {
    const ip = await createContext(
      { headers: { "x-forwarded-for": "203.0.113.1, 10.0.0.1" } },
      { requestIP: () => ({ address: "127.0.0.1", port: 3000 }) },
    ).run();

    expect(ip).toBe("203.0.113.1");
  });

  test("falls back to Bun socket IP when proxy headers are missing", async () => {
    const ip = await createContext(
      {},
      { requestIP: () => ({ address: "127.0.0.1", port: 54321 }) },
    ).run();

    expect(ip).toBe("127.0.0.1");
  });

  test("returns unknown when neither proxy headers nor socket IP exist", async () => {
    const ip = await createContext({}).run();
    expect(ip).toBe("unknown");
  });
});
