import { createRoute, type OpenAPIHono } from "@hono/zod-openapi";
import type { AppEnv } from "../../lib/app-env";
import { createDexServerErrorResponses } from "../../lib/dex/openapi-errors";
import { registerDexGetProxyRoute } from "../../lib/dex/proxy";
import {
  OKX_PROVIDER,
  OKX_UPSTREAM_PATHS,
  okxGet,
} from "../../lib/dex/providers/okx/client";
import {
  OkxQuoteResponseSchema,
  OkxSwapResponseSchema,
} from "../../lib/dex/providers/okx/openapi-schemas";
import {
  OkxQuoteQuerySchema,
  OkxSwapQuerySchema,
} from "../../lib/dex/providers/okx/request-schemas";

const okxServerErrors = createDexServerErrorResponses(OKX_PROVIDER);

const okxQuoteRoute = createRoute({
  method: "get",
  path: "/api/okx/dex/aggregator/quote",
  tags: ["OKX"],
  summary: "OKX DEX aggregator quote",
  description:
    "Transparent proxy to OKX DEX quote API (`GET /api/v6/dex/aggregator/quote`). The server signs the upstream request with `OKX_API_KEY` / `OKX_API_SECRET` / `OKX_API_PASSPHRASE` and returns the OKX response body, HTTP status, and headers as-is.\n\n**Required query fields:** `chainIndex`, `amount`, `fromTokenAddress`, `toTokenAddress`.\n\n**Optional query fields:** all others; omit them when not needed. Unknown query parameters are also forwarded to OKX.",
  request: {
    query: OkxQuoteQuerySchema,
  },
  responses: {
    200: {
      description:
        "OKX quote response (passthrough). `data[0]` includes `toTokenAmount`, `dexRouterList`, `estimateGasFee`, `priceImpactPercent`.",
      content: {
        "application/json": {
          schema: OkxQuoteResponseSchema,
        },
      },
    },
    ...okxServerErrors,
  },
});

const okxSwapRoute = createRoute({
  method: "get",
  path: "/api/okx/dex/aggregator/swap",
  tags: ["OKX"],
  summary: "OKX DEX aggregator swap",
  description:
    "Transparent proxy to OKX DEX swap API (`GET /api/v6/dex/aggregator/swap`). Returns calldata and tx metadata for on-chain execution. The server signs the upstream request with `OKX_API_KEY` / `OKX_API_SECRET` / `OKX_API_PASSPHRASE` and returns the OKX response body, HTTP status, and headers as-is.\n\n**Required query fields:** `chainIndex`, `amount`, `fromTokenAddress`, `toTokenAddress`, `slippagePercent`, `userWalletAddress`.\n\n**Optional query fields:** all others; omit them when not needed. Unknown query parameters are also forwarded to OKX.",
  request: {
    query: OkxSwapQuerySchema,
  },
  responses: {
    200: {
      description:
        "OKX swap response (passthrough). `data[0]` includes `routerResult` and `tx.data` calldata.",
      content: {
        "application/json": {
          schema: OkxSwapResponseSchema,
        },
      },
    },
    ...okxServerErrors,
  },
});

export function registerOkxDexRoutes(app: OpenAPIHono<AppEnv>): void {
  registerDexGetProxyRoute(app, okxQuoteRoute, {
    provider: OKX_PROVIDER,
    upstreamPath: OKX_UPSTREAM_PATHS.quote,
    querySchema: OkxQuoteQuerySchema,
    get: okxGet,
  });

  registerDexGetProxyRoute(app, okxSwapRoute, {
    provider: OKX_PROVIDER,
    upstreamPath: OKX_UPSTREAM_PATHS.swap,
    querySchema: OkxSwapQuerySchema,
    get: okxGet,
  });
}
