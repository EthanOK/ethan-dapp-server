import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import type { AppEnv } from "../src/server/lib/app-env";
import {
  countryFromHeaders,
  isLocalOrPrivateIp,
  resolveCountry,
} from "../src/server/lib/ip-country";

function createContext(headers?: HeadersInit) {
  const app = new Hono<AppEnv>();
  let captured: string | null = null;

  app.get("/test", (c) => {
    captured = countryFromHeaders(c);
    return c.text("ok");
  });

  const req = new Request("http://localhost:3000/test", { headers });
  return {
    async run() {
      await app.fetch(req);
      return captured;
    },
    app,
    req,
  };
}

describe("ip-country", () => {
  test("countryFromHeaders reads CF-IPCountry", async () => {
    const country = await createContext({ "cf-ipcountry": "cn" }).run();
    expect(country).toBe("CN");
  });

  test("countryFromHeaders ignores unknown CF codes", async () => {
    const country = await createContext({ "cf-ipcountry": "XX" }).run();
    expect(country).toBeNull();
  });

  test("isLocalOrPrivateIp detects loopback and RFC1918", () => {
    expect(isLocalOrPrivateIp("127.0.0.1")).toBe(true);
    expect(isLocalOrPrivateIp("::1")).toBe(true);
    expect(isLocalOrPrivateIp("10.0.0.5")).toBe(true);
    expect(isLocalOrPrivateIp("203.0.113.1")).toBe(false);
  });

  test("resolveCountry uses proxy header before IP lookup", async () => {
    const { app, req } = createContext({ "cf-ipcountry": "US" });
    let country = "";

    app.get("/resolve", async (c) => {
      country = await resolveCountry(c, "203.0.113.1");
      return c.text("ok");
    });

    await app.fetch(new Request("http://localhost:3000/resolve", { headers: req.headers }));
    expect(country).toBe("US");
  });

  test("resolveCountry returns Local for private IPs without header", async () => {
    const app = new Hono<AppEnv>();
    let country = "";

    app.get("/resolve", async (c) => {
      country = await resolveCountry(c, "127.0.0.1");
      return c.text("ok");
    });

    await app.fetch(new Request("http://localhost:3000/resolve"));
    expect(country).toBe("Local");
  });
});
