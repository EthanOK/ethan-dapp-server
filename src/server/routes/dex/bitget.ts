import { createRoute, type OpenAPIHono } from "@hono/zod-openapi";
import type { AppEnv } from "../../lib/app-env";
import { createDexServerErrorResponses } from "../../lib/dex/openapi-errors";
import { registerDexProxyRoute } from "../../lib/dex/proxy";
import {
  BITGET_PROVIDER,
  BITGET_UPSTREAM_PATHS,
  bitgetPost,
} from "../../lib/dex/providers/bitget/client";
import {
  BitgetQuoteResponseSchema,
  BitgetSwapResponseSchema,
} from "../../lib/dex/providers/bitget/openapi-schemas";
import {
  BitgetQuoteBodySchema,
  BitgetSwapBodySchema,
} from "../../lib/dex/providers/bitget/request-schemas";

const bitgetServerErrors = createDexServerErrorResponses(BITGET_PROVIDER);

const bitgetQuoteRoute = createRoute({
  method: "post",
  path: "/api/bitget/dex/aggregator/quote",
  tags: ["Bitget"],
  summary: "Bitget DEX aggregator quote",
  description:
    "Transparent proxy to Bitget instruction-mode quote API (`POST /bgw-pro/swapx/pro/quote`). The server signs the upstream request with `BITGET_API_KEY` / `BITGET_API_SECRET` and returns the Bitget response body, HTTP status, and headers as-is.\n\n**Required body fields:** `fromContract`, `fromAmount`, `fromChain`, `toContract`, `toChain`.\n\n**Optional body fields:** all others; omit them when not needed. Unknown fields are also forwarded to Bitget.",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: BitgetQuoteBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description:
        "Bitget quote response (passthrough). Required in `data`: `toAmount`, `market`, `estimateRevert`, `slippage`. Optional: `gasLimit` (with estimateGas), `computeUnits` (SOL).",
      content: {
        "application/json": {
          schema: BitgetQuoteResponseSchema,
        },
      },
    },
    ...bitgetServerErrors,
  },
});

const bitgetSwapRoute = createRoute({
  method: "post",
  path: "/api/bitget/dex/aggregator/swap",
  tags: ["Bitget"],
  summary: "Bitget DEX aggregator swap",
  description:
    "Transparent proxy to Bitget instruction-mode swap API (`POST /bgw-pro/swapx/pro/swap`). Returns calldata and order metadata for on-chain execution. The server signs the upstream request with `BITGET_API_KEY` / `BITGET_API_SECRET` and returns the Bitget response body, HTTP status, and headers as-is.\n\n**Required body fields:** `fromContract`, `fromAmount`, `fromChain`, `toContract`, `toChain`, `fromAddress`, `toAddress`, `market`.\n\n**Optional body fields:** all others; omit them when not needed. Unknown fields are also forwarded to Bitget.",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: BitgetSwapBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description:
        "Bitget swap response (passthrough). Simple mode: `calldata` + `contract`. Rich mode (`requestMod=rich`): `swapTransaction`, `routePath`, `gasFee`. SOL: `instructionLists`.",
      content: {
        "application/json": {
          schema: BitgetSwapResponseSchema,
        },
      },
    },
    ...bitgetServerErrors,
  },
});

export function registerBitgetDexRoutes(app: OpenAPIHono<AppEnv>): void {
  registerDexProxyRoute(app, bitgetQuoteRoute, {
    provider: BITGET_PROVIDER,
    upstreamPath: BITGET_UPSTREAM_PATHS.quote,
    bodySchema: BitgetQuoteBodySchema,
    post: bitgetPost,
  });

  registerDexProxyRoute(app, bitgetSwapRoute, {
    provider: BITGET_PROVIDER,
    upstreamPath: BITGET_UPSTREAM_PATHS.swap,
    bodySchema: BitgetSwapBodySchema,
    post: bitgetPost,
  });
}
