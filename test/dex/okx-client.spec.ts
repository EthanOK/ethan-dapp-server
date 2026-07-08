import { describe, expect, test } from "bun:test";
import { okxSignature } from "../../src/server/lib/dex/providers/okx/client";

describe("okxSignature", () => {
  test("matches OKX HMAC SHA256 signing example", () => {
    const signature = okxSignature(
      "2020-12-08T09:08:57.715Z",
      "GET",
      "/api/v6/dex/aggregator/swap",
      "",
      "22582BD0CFF14C41EDBF1AB98506286D",
    );

    expect(signature).toBe("HYLXSIxEnKR+RYunm9J+4LkeEVH/FKhcMyI/G/THb0M=");
  });

  test("includes query string in request path", () => {
    const signature = okxSignature(
      "2020-12-08T09:08:57.715Z",
      "GET",
      "/api/v6/dex/aggregator/quote?amount=1&chainIndex=1",
      "",
      "secret",
    );

    expect(signature).toBe(
      okxSignature(
        "2020-12-08T09:08:57.715Z",
        "GET",
        "/api/v6/dex/aggregator/quote?amount=1&chainIndex=1",
        "",
        "secret",
      ),
    );
    expect(signature).not.toBe(
      okxSignature(
        "2020-12-08T09:08:57.715Z",
        "GET",
        "/api/v6/dex/aggregator/quote",
        "",
        "secret",
      ),
    );
  });
});
