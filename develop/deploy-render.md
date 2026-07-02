# Deploy to Render

This app runs as a **Bun Web Service** using `Bun.serve` + Hono. No Docker or Node adapter required.

## Blueprint (recommended)

1. Push the repo to GitHub.
2. In [Render Dashboard](https://dashboard.render.com/) → **New** → **Blueprint**.
3. Connect the repo; Render reads [`render.yaml`](../render.yaml) at the repo root.

## Manual Web Service

| Setting | Value |
| --- | --- |
| Runtime | Bun |
| Build Command | `bun run build` (Render Bun runtime runs `bun install` first; do not use `&&` — it may be truncated) |
| Start Command | `bun run start` |

Ensure the repo contains `bun.lock` (or set `BUN_VERSION` / `.bun-version`).

## Environment variables

| Key | Required | Notes |
| --- | --- | --- |
| `JWT_SECRET_KEY` | Yes | Random secret for JWT signing |
| `JWT_EXPIRES` | No | Default `7d` |
| `SWAGGER_PASSWORD` | No | When set, `/swagger` requires a password; `/api/*` stays public |
| `WEBHOOK_<DEST>_URL` | For relay | Per-destination target, e.g. `WEBHOOK_DISCORD_URL` for `destination: "discord"` |
| `WEBHOOK_FORWARD_TIMEOUT_MS` | No | Forward request timeout (default `10000`) |
| `NODE_ENV` | Set by blueprint | `production` |

`PORT` is set automatically by Render — do not override.

## What gets built

`bun run build` produces:

- `public/index.html` + bundled JS/CSS (React SPA)

Swagger HTML is served from `src/server/static/` at runtime (not copied to `public/`).

`bun run start` runs `src/server/index.ts`, which calls `Bun.serve` and serves API + static files.

## Verify after deploy

Replace `YOUR_HOST` with your `*.onrender.com` URL:

```bash
curl -sS "https://YOUR_HOST/api/hello"
curl -sS "https://YOUR_HOST/api/openapi.json" | head
open "https://YOUR_HOST/swagger"
```

OpenAPI `servers[0].url` should be `https://YOUR_HOST` (not `http://`), so Swagger **Try it out** works without mixed-content errors.

## Swagger password gate

Set `SWAGGER_PASSWORD` in the Render dashboard to require a password before the Swagger UI loads.

- Gated: `GET /swagger` (and `/swagger.html`) — shows a password form, then sets an HttpOnly cookie for 24h.
- Public: all `/api/*` routes, including `GET /api/openapi.json`.
- Auth endpoint: `POST /api/swagger-auth` with `{ "password": "..." }`.

Leave `SWAGGER_PASSWORD` unset to serve Swagger UI without a gate (fine for local dev).

## Login in Swagger

`/api/login` uses Sign-In with Ethereum (SIWE). Swagger pre-fills a valid demo `message` + `signature` for the current host (ephemeral demo wallet, random nonce). You still need `JWT_SECRET_KEY` on Render for a successful 200 response.
