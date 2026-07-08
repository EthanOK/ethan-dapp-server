process.env.JWT_SECRET_KEY ??= "test-jwt-secret";
process.env.NODE_ENV ??= "production";
process.env.SWAGGER_PASSWORD = "";

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

type BitgetCapturedRequest = {
  headers: Headers;
  body: unknown;
  path: string;
};

let lastBitgetRequest: BitgetCapturedRequest | null = null;
let bitgetStatusToReturn = 200;
let bitgetBodyToReturn: unknown = {
  status: 0,
  data: {
    toAmount: "1.000972",
    market: "jupiter.router",
    slippage: "2",
    estimateRevert: false,
  },
};
const bitgetTarget = Bun.serve({
  port: 0,
  async fetch(req) {
    const url = new URL(req.url);
    lastBitgetRequest = {
      path: url.pathname,
      headers: req.headers,
      body: await req.json(),
    };
    return Response.json(bitgetBodyToReturn, { status: bitgetStatusToReturn });
  },
});
process.env.BITGET_API_URL = `http://localhost:${bitgetTarget.port}`;
process.env.BITGET_API_KEY = "test-api-key";
process.env.BITGET_API_SECRET = "test-api-secret";

let app: Awaited<typeof import("../src/server/server")>["app"];

beforeAll(async () => {
  ({ app } = await import("../src/server/server"));
});

afterAll(() => {
  forwardTarget.stop(true);
  bitgetTarget.stop(true);
});

async function fetchApp(path: string, init?: RequestInit): Promise<Response> {
  return await app.fetch(new Request(`${origin}${path}`, init), {
    SERVER: {
      requestIP: () => ({ address: "127.0.0.1", port: 3000 }),
    },
  });
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

describe("Bitget DEX proxy", () => {
  test("POST /api/bitget/dex/aggregator/quote forwards signed request", async () => {
    lastBitgetRequest = null;
    bitgetStatusToReturn = 200;
    bitgetBodyToReturn = {
      status: 0,
      data: {
        toAmount: "1.000972",
        market: "jupiter.router",
        slippage: "2",
        estimateRevert: false,
      },
    };

    const quoteBody = {
      fromContract: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
      fromAmount: "1",
      fromChain: "sol",
      toContract: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      toChain: "sol",
      estimateGas: true,
    };

    const res = await fetchApp("/api/bitget/dex/aggregator/quote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(quoteBody),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(bitgetBodyToReturn);

    expect(lastBitgetRequest).not.toBeNull();
    const captured = lastBitgetRequest!;
    expect(captured.path).toBe("/bgw-pro/swapx/pro/quote");
    expect(captured.body).toEqual(quoteBody);
    expect(captured.headers.get("x-api-key")).toBe("test-api-key");
    expect(captured.headers.get("x-api-timestamp")).toMatch(/^\d+$/);
    expect(captured.headers.get("x-api-signature")).toBeTruthy();
  });

  test("POST /api/bitget/dex/aggregator/swap forwards signed request", async () => {
    lastBitgetRequest = null;
    bitgetStatusToReturn = 200;
    bitgetBodyToReturn = {
      status: 0,
      data: {
        id: "fbc288e957b14524b20ebcdd8a7fc740",
        market: "bgwevmaggregator",
        contract: "0x6D0034c7DA87e8f0526b21aa890d40A77C755B68",
        calldata: "0xabc",
        deadline: 120,
      },
      msg: "success",
    };

    const swapBody = {
      fromContract: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      fromAmount: "100",
      fromChain: "eth",
      toContract: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      toChain: "eth",
      fromAddress: "0xd8FeBD1C242a282f1b8226d34282942F6F63248b",
      toAddress: "0xd8FeBD1C242a282f1b8226d34282942F6F63248b",
      slippage: 1,
      market: "bgwaggregator",
      requestMod: "rich",
    };

    const res = await fetchApp("/api/bitget/dex/aggregator/swap", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(swapBody),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(bitgetBodyToReturn);

    expect(lastBitgetRequest).not.toBeNull();
    const captured = lastBitgetRequest!;
    expect(captured.path).toBe("/bgw-pro/swapx/pro/swap");
    expect(captured.body).toEqual(swapBody);
    expect(captured.headers.get("x-api-key")).toBe("test-api-key");
    expect(captured.headers.get("x-api-signature")).toBeTruthy();
  });

  test("POST /api/bitget/dex/aggregator/quote passthrough upstream status and body", async () => {
    bitgetStatusToReturn = 403;
    bitgetBodyToReturn = { status: 403, msg: "Forbidden" };

    try {
      const res = await fetchApp("/api/bitget/dex/aggregator/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fromContract: "",
          fromAmount: "1",
          fromChain: "eth",
          toContract: "0xabc",
          toChain: "eth",
        }),
      });

      expect(res.status).toBe(403);
      await expect(res.json()).resolves.toEqual(bitgetBodyToReturn);
    } finally {
      bitgetStatusToReturn = 200;
      bitgetBodyToReturn = {
        status: 0,
        data: {
          toAmount: "1.000972",
          market: "jupiter.router",
          slippage: "2",
          estimateRevert: false,
        },
      };
    }
  });

  test("POST /api/bitget/dex/aggregator/quote returns 503 without credentials", async () => {
    const savedKey = process.env.BITGET_API_KEY;
    const savedSecret = process.env.BITGET_API_SECRET;
    delete process.env.BITGET_API_KEY;
    delete process.env.BITGET_API_SECRET;

    try {
      const res = await fetchApp("/api/bitget/dex/aggregator/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fromContract: "",
          fromAmount: "1",
          fromChain: "eth",
          toContract: "0xabc",
          toChain: "eth",
        }),
      });

      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body.code).toBe(-503);
    } finally {
      process.env.BITGET_API_KEY = savedKey;
      process.env.BITGET_API_SECRET = savedSecret;
    }
  });
});
