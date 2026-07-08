# How to add a DEX aggregator provider

DEX routes are **transparent proxies**: the server signs upstream requests with provider credentials and returns the upstream body, HTTP status, and headers as-is.

Current providers:

| Provider | Local prefix | Upstream |
| --- | --- | --- |
| Bitget | `/api/bitget/dex/aggregator/*` | `https://bopenapi.bgwapi.io/bgw-pro/swapx/pro/*` |
| OKX | `/api/okx/dex/aggregator/*` | _(stub — not implemented)_ |

## Layout

```
src/server/
├── lib/dex/
│   ├── proxy.ts              # handleDexProxy, registerDexProxyRoute
│   ├── passthrough.ts        # passthroughUpstreamResponse
│   ├── errors.ts             # DexProviderNotConfiguredError
│   ├── openapi-errors.ts     # createDexServerErrorResponses(provider)
│   └── providers/
│       └── {name}/
│           ├── config.ts     # env: API URL, credentials
│           ├── client.ts       # signing + authenticated POST
│           ├── request-schemas.ts
│           └── openapi-schemas.ts
└── routes/dex/
    ├── index.ts              # registerDexRoutes()
    ├── bitget.ts
    └── okx.ts
```

Shared code stays in `lib/dex/`. Each provider owns its signing, env vars, and OpenAPI schemas.

## Steps to add a provider (e.g. OKX)

### 1. Config and client

`src/server/lib/dex/providers/okx/config.ts`:

```ts
export function okxApiUrl(): string {
  return process.env.OKX_API_URL?.trim() || "https://…";
}

export function okxCredentials(): { apiKey: string; apiSecret: string; passphrase: string } | null {
  // read OKX_API_KEY, OKX_API_SECRET, OKX_API_PASSPHRASE
}
```

`client.ts`: implement `okxPost(apiPath, payload)` using the provider’s auth scheme. Throw `DexProviderNotConfiguredError("OKX")` when credentials are missing.

### 2. OpenAPI schemas

- `request-schemas.ts` — Zod bodies with `[Required]` / `[Optional]` in descriptions (match upstream docs).
- `openapi-schemas.ts` — Zod response shapes from upstream docs (quote, swap, etc.).

Use `.passthrough()` on request bodies so unknown upstream fields are forwarded.

### 3. Routes

`src/server/routes/dex/okx.ts`:

```ts
registerDexProxyRoute(app, okxQuoteRoute, {
  provider: "OKX",
  upstreamPath: OKX_UPSTREAM_PATHS.quote,
  bodySchema: OkxQuoteBodySchema,
  post: okxPost,
});
```

Register in `routes/dex/index.ts` via `registerOkxDexRoutes(app)`.

### 4. Environment

Add vars to `.env.example` and document in `README.md` / `develop/deploy-render.md`.

### 5. Tests

- Unit test signing in `test/dex/okx-client.spec.ts`.
- Integration test with a local `Bun.serve` mock upstream in `test/api.spec.ts` (see Bitget examples).

## Conventions

- **Path pattern:** `/api/{provider}/dex/aggregator/{action}` (e.g. `quote`, `swap`).
- **Swagger tag:** provider name (`Bitget`, `OKX`).
- **Timeout:** all outbound calls use shared `TIMEOUT_MS` (default `5000`).
- **Errors:** `503` when credentials missing; `502` when upstream unreachable; otherwise passthrough upstream status/body.

## Bitget reference

See `src/server/lib/dex/providers/bitget/` and `src/server/routes/dex/bitget.ts` for a complete example.
