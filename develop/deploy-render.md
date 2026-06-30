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
| Build Command | `bun install && bun run build` |
| Start Command | `bun run start` |

Ensure the repo contains `bun.lock` (or set `BUN_VERSION` / `.bun-version`).

## Environment variables

| Key | Required | Notes |
| --- | --- | --- |
| `JWT_SECRET_KEY` | Yes | Random secret for JWT signing |
| `JWT_EXPIRES` | No | Default `7d` |
| `NODE_ENV` | Set by blueprint | `production` |

`PORT` is set automatically by Render — do not override.

## What gets built

`bun run build` produces:

- `public/index.html` + bundled JS/CSS (React SPA)
- `public/swagger.html` (Swagger UI)

`bun run start` runs `src/index.ts`, which calls `Bun.serve` and serves API + static files.

## Verify after deploy

Replace `YOUR_HOST` with your `*.onrender.com` URL:

```bash
curl -sS "https://YOUR_HOST/api/hello"
curl -sS "https://YOUR_HOST/api/openapi.json" | head
open "https://YOUR_HOST/swagger"
```

OpenAPI `servers[0].url` should be `https://YOUR_HOST` (not `http://`), so Swagger **Try it out** works without mixed-content errors.

## Login in Swagger

`/api/login` uses Sign-In with Ethereum (SIWE). Swagger pre-fills a valid demo `message` + `signature` for the current host (ephemeral demo wallet, random nonce). You still need `JWT_SECRET_KEY` on Render for a successful 200 response.
