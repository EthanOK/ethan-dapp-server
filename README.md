# Ethan DApp Server

Bun full-stack app: React frontend + Hono API on `Bun.serve`, with OpenAPI docs via `@hono/zod-openapi`.

## Quick start

```bash
bun install
cp .env.example .env   # set JWT_SECRET_KEY for /api/login
bun dev
```

| URL                                    | Description           |
| -------------------------------------- | --------------------- |
| http://localhost:3000/                 | Home (React SPA)      |
| http://localhost:3000/swagger          | Swagger UI            |
| http://localhost:3000/api/openapi.json | OpenAPI spec          |
| http://localhost:3000/api/health       | Health check          |
| http://localhost:3000/api/hello        | Example API           |
| http://localhost:3000/api/login        | SIWE wallet login (server-side Discord notify) |
| http://localhost:3000/api/me           | Current session (JWT) |
| http://localhost:3000/api/bitget/dex/aggregator/quote | Bitget quote proxy |
| http://localhost:3000/api/bitget/dex/aggregator/swap  | Bitget swap proxy  |
| http://localhost:3000/api/okx/dex/aggregator/quote  | OKX quote proxy (GET) |
| http://localhost:3000/api/okx/dex/aggregator/swap   | OKX swap proxy (GET)  |

## Scripts

| Command         | Description                                           |
| --------------- | ----------------------------------------------------- |
| `bun dev`       | Dev server with HMR (`bun --hot src/server/index.ts`) |
| `bun run build` | Bundle frontend to `public/`                          |
| `bun run start` | Production server (`NODE_ENV=production`)             |
| `bun test`      | API 可用性冒烟测试（`app.fetch`，无需启动服务）       |
| `bun run fmt`   | Format with Prettier                                  |
| `bun run lint`  | Type-check with `tsc --noEmit`                        |

## Environment

Copy `.env.example` to `.env`:

| Variable         | Required        | Description                                    |
| ---------------- | --------------- | ---------------------------------------------- |
| `JWT_SECRET_KEY` | Yes (for login) | Secret for signing JWT `userToken`             |
| `JWT_EXPIRES`    | No              | JWT expiry (default `7d`)                      |
| `SWAGGER_PASSWORD` | No            | When set, `/swagger` requires a password; `/api/*` stays public |
| `TIMEOUT_MS`     | No              | Shared outbound request timeout in ms (default `5000`; login notify, Bitget/OKX proxy, Swagger notify, IP lookup) |
| `SWAGGER_AUTH_NOTIFY_URL` | No       | Server-side webhook URL; on successful Swagger login, POST IP, country, city/region, IP type, ISP, User-Agent, etc. (not called from the browser) |
| `WEBHOOK_DISCORD_URL` | For login notify | `POST /api/login` asynchronously POSTs SIWE payload here (server-side only) |
| `BITGET_API_URL` | For Bitget DEX | Bitget API base URL (default `https://bopenapi.bgwapi.io`) |
| `BITGET_API_KEY` | For Bitget DEX | Bitget API key (server-side only; used to sign upstream requests) |
| `BITGET_API_SECRET` | For Bitget DEX | Bitget API secret |
| `OKX_API_URL` | For OKX DEX | OKX API base URL (default `https://web3.okx.com`) |
| `OKX_API_KEY` | For OKX DEX | OKX API key (server-side signing) |
| `OKX_API_SECRET` | For OKX DEX | OKX API secret |
| `OKX_API_PASSPHRASE` | For OKX DEX | OKX API passphrase |
| `PORT`           | No              | Listen port (dev default `3000`, `bun run start` default `3001`; Render sets this) |

## Architecture

```
src/
├── client/          # React SPA
│   ├── index.html   # Home entry (dev: Bun HTML import)
│   ├── frontend.tsx
│   └── App.tsx
└── server/          # Bun.serve + Hono API
    ├── index.ts     # Entry — Bun.serve
    ├── server.ts    # Hono app, OpenAPI, static files
    ├── static/
    │   ├── swagger.html       # Swagger UI shell (unpkg CDN)
    │   └── swagger-gate.html  # Password gate when SWAGGER_PASSWORD is set
    ├── routes/      # API modules
    │   └── dex/     # DEX aggregator proxies (Bitget, OKX)
    └── lib/
        ├── dex/     # Shared DEX proxy (passthrough, errors, OpenAPI helpers)
        │   └── providers/
        │       ├── bitget/   # Bitget signing, schemas
        │       └── okx/      # OKX HMAC GET signing, schemas
        ├── login-notify.ts   # Server-side Discord notify on wallet login
        ├── request-log.ts    # API error logging middleware
        └── …          # Auth, OpenAPI patches, middleware
public/              # Build output (bun run build)
```

| Path                     | Role                                            |
| ------------------------ | ----------------------------------------------- |
| `src/server/index.ts`    | Entry — `Bun.serve({ port, fetch: app.fetch })` |
| `src/server/server.ts`   | Hono app: routes, OpenAPI, static files         |
| `src/server/routes/*.ts` | API modules (schema + handler + OpenAPI)        |
| `src/server/lib/`        | Auth, demo login, middleware, OpenAPI patches   |
| `src/client/`            | React frontend source                           |
| `public/`                | Build output (`bun run build`)                  |

## Production

```bash
bun run build
bun run start   # http://localhost:3001 by default
```

- **Dev** (`bun dev`, port `3000`): `/` serves `src/client/` via Bun HTML import (HMR); `/swagger` serves `src/server/static/swagger.html`.
- **Prod** (`bun run start`, port `3001` unless `PORT` is set): requires `bun run build` first — home and assets from `public/`; Swagger always from `src/server/static/`.
- **Swagger UI**: dark mode (default on, persisted in `localStorage`); bottom Schemas section collapsed by default. Optional password gate via `SWAGGER_PASSWORD`. Optional login notify via `SWAGGER_AUTH_NOTIFY_URL` (server-side; includes IP, country, city/region, VPN/datacenter hint, ISP).
- **Wallet login notify**: set `WEBHOOK_DISCORD_URL` — `POST /api/login` notifies Discord server-side (async; login still succeeds if notify fails). No browser webhook call.
- **Logs**: API responses with status ≥ 400 log `[api] METHOD /path -> status` to stdout; DEX upstream failures log `[dex] …`. View on Render Dashboard → **Logs**.

## Deploy (Render)

The repo includes [`render.yaml`](./render.yaml) for [Render](https://render.com/):

- **Runtime:** `bun`
- **Build:** `bun run build` (Render Bun runtime runs `bun install` first)
- **Start:** `bun run start`

Set `JWT_SECRET_KEY`, `WEBHOOK_DISCORD_URL`, Bitget/OKX DEX keys, and optionally `SWAGGER_PASSWORD`, `SWAGGER_AUTH_NOTIFY_URL` in the Render dashboard (`sync: false` in `render.yaml`). Render injects `PORT` and terminates TLS; the app reads `X-Forwarded-Proto` so OpenAPI `servers` use `https://`.

See [develop/deploy-render.md](./develop/deploy-render.md) for step-by-step setup.

## Developer docs

See the [develop/](./develop/) directory.

| Doc                                                    | Description                   |
| ------------------------------------------------------ | ----------------------------- |
| [develop/architecture.md](./develop/architecture.md)   | System architecture           |
| [develop/add-api.md](./develop/add-api.md)             | How to add a new API endpoint |
| [develop/add-dex-provider.md](./develop/add-dex-provider.md) | How to add a DEX provider (e.g. OKX) |
| [develop/deploy-render.md](./develop/deploy-render.md) | Deploy to Render              |
