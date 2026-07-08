import { describe, expect, test } from "bun:test";
import { bitgetSignature } from "../../src/server/lib/dex/providers/bitget/client";
import { passthroughUpstreamResponse } from "../../src/server/lib/dex/passthrough";

describe("bitgetSignature", () => {
  test("matches Bitget Node.js example algorithm", () => {
    const signature = bitgetSignature(
      "/swap/api/test",
      '{"data":"test"}',
      "key",
      "secret",
      "17200001",
      { param1: "test1", param2: "test2" },
    );

    expect(signature).toBe("3t7ShL9NQmUxxHi0MSnAbf8DyIcLRwtHEdo7K5wyRM4=");
  });
});

describe("passthroughUpstreamResponse", () => {
  test("preserves upstream status and body", async () => {
    const upstream = new Response(JSON.stringify({ status: 403, msg: "Forbidden" }), {
      status: 403,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-encoding": "gzip",
        "x-trace-id": "abc",
        connection: "keep-alive",
      },
    });

    const relayed = passthroughUpstreamResponse(upstream);
    expect(relayed.status).toBe(403);
    expect(relayed.headers.get("content-type")).toBe(
      "application/json; charset=utf-8",
    );
    expect(relayed.headers.get("content-encoding")).toBeNull();
    expect(relayed.headers.get("x-trace-id")).toBe("abc");
    expect(relayed.headers.get("connection")).toBeNull();
    await expect(relayed.json()).resolves.toEqual({
      status: 403,
      msg: "Forbidden",
    });
  });
});
