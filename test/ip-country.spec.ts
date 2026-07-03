import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import type { AppEnv } from "../src/server/lib/app-env";
import type { ClientGeo } from "../src/server/lib/ip-country";
import {
  countryFromHeaders,
  formatCountryCode,
  formatLocation,
  inferSecurity,
  isLocalOrPrivateIp,
  resolveClientGeo,
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
  test("formatLocation combines city and region", () => {
    expect(formatLocation("California", "Mountain View")).toBe(
      "Mountain View, California",
    );
    expect(formatLocation("Southeast", "Singapore")).toBe(
      "Singapore, Southeast",
    );
    expect(formatLocation(null, "Singapore")).toBe("Singapore");
    expect(formatLocation(null, null)).toBeNull();
  });

  test("formatCountryCode expands ISO codes to full names", () => {
    expect(formatCountryCode("sg")).toBe("Singapore (SG)");
    expect(formatCountryCode("US")).toBe("United States (US)");
  });

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

  test("inferSecurity uses API security when available", () => {
    const security = inferSecurity(
      { org: "Example ISP" },
      { vpn: true, proxy: false, hosting: false, tor: false },
    );
    expect(security.vpn).toBe(true);
    expect(security.label).toBe("Likely VPN");
  });

  test("inferSecurity flags datacenter org names heuristically", () => {
    const security = inferSecurity({
      org: "FDCservers.net",
      isp: "FDCservers.net",
    });
    expect(security.hosting).toBe(true);
    expect(security.label).toContain("datacenter");
  });

  test("inferSecurity flags VPN providers heuristically", () => {
    const security = inferSecurity({
      org: "NordVPN",
      isp: "NordVPN",
    });
    expect(security.vpn).toBe(true);
    expect(security.label).toContain("VPN");
  });

  test("resolveClientGeo uses proxy header before IP lookup", async () => {
    const { app, req } = createContext({ "cf-ipcountry": "US" });
    let geo: ClientGeo | null = null;

    app.get("/resolve", async (c) => {
      geo = await resolveClientGeo(c, "203.0.113.1");
      return c.text("ok");
    });

    await app.fetch(
      new Request("http://localhost:3000/resolve", { headers: req.headers }),
    );
    expect(geo).not.toBeNull();
    expect(geo!.country).toBe("United States (US)");
  });

  test("resolveClientGeo returns Local for private IPs without header", async () => {
    const app = new Hono<AppEnv>();
    let geo: ClientGeo | null = null;

    app.get("/resolve", async (c) => {
      geo = await resolveClientGeo(c, "127.0.0.1");
      return c.text("ok");
    });

    await app.fetch(new Request("http://localhost:3000/resolve"));
    expect(geo).not.toBeNull();
    expect(geo!.country).toBe("Local");
    expect(geo!.security).toBeNull();
  });
});
