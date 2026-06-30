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
| http://localhost:3000/api/login        | SIWE wallet login     |
| http://localhost:3000/api/me           | Current session (JWT) |

## Scripts

| Command         | Description                                           |
| --------------- | ----------------------------------------------------- |
| `bun dev`       | Dev server with HMR (`bun --hot src/server/index.ts`) |
| `bun run build` | Bundle frontend to `public/`; copy Swagger HTML       |
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
| `PORT`           | No              | Listen port (default `3000`; Render sets this) |

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
    │   └── swagger.html  # Swagger UI shell (unpkg CDN)
    ├── routes/      # API modules (incl. /api/me JWT example)
    └── lib/         # Auth, OpenAPI patches, middleware
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
bun run start
```

- **Dev** (`bun dev`): `/` serves `src/client/` via Bun HTML import (HMR); `/swagger` serves `src/server/static/swagger.html`.
- **Prod** (`bun run start`): requires `bun run build` first — home, Swagger, and assets are served from `public/`.

## Deploy (Render)

The repo includes [`render.yaml`](./render.yaml) for [Render](https://render.com/):

- **Runtime:** `bun`
- **Build:** `bun install && bun run build`
- **Start:** `bun run start`

Set `JWT_SECRET_KEY` in the Render dashboard (marked `sync: false` in `render.yaml`). Render injects `PORT` and terminates TLS; the app reads `X-Forwarded-Proto` so OpenAPI `servers` use `https://`.

See [develop/deploy-render.md](./develop/deploy-render.md) for step-by-step setup.

## Developer docs

See the [develop/](./develop/) directory.

| Doc                                                    | Description                   |
| ------------------------------------------------------ | ----------------------------- |
| [develop/architecture.md](./develop/architecture.md)   | System architecture           |
| [develop/add-api.md](./develop/add-api.md)             | How to add a new API endpoint |
| [develop/deploy-render.md](./develop/deploy-render.md) | Deploy to Render              |
