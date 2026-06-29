# Deploy on Vercel

This project deploys to [Vercel](https://vercel.com/) with the [Bun runtime](https://bun.com/docs/guides/deployment/vercel).

## Architecture

| Layer | Local (`bun dev`) | Vercel |
|-------|-------------------|--------|
| All routes | Hono `app.fetch` via [Bun export default](https://hono.dev/docs/getting-started/bun) | Hono via `hono/vercel` |
| Frontend | Static files in `dist/` (run `bun run build` first) | Static files in `dist/` |
| Swagger | `src/docs.html` (dev) / `dist/swagger.html` (prod) | `dist/swagger.html` |

> **Note:** [Vercel does not support `Bun.serve`](https://bun.com/docs/guides/deployment/vercel). Both local and Vercel use the same Hono `app` from `src/server.ts`.

## Prerequisites

- [Vercel account](https://vercel.com/)
- Bun installed locally (match Vercel's Bun 1.x when possible)

## Configuration

### `vercel.json`

```json
{
  "bunVersion": "1.x",
  "buildCommand": "bun run build",
  "outputDirectory": "dist"
}
```

`bunVersion: "1.x"` enables the Bun runtime for serverless functions. Vercel manages the minor version.

### Environment variables

Set these in the Vercel project dashboard (**Settings → Environment Variables**):

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET_KEY` | Yes | JWT signing secret for login |
| `JWT_EXPIRES` | No | Token TTL (default `7d`) |
| `BUN_PUBLIC_*` | No | Frontend env vars inlined at build time |

## Deploy

### From CLI

```bash
bunx vercel login
bunx vercel deploy          # preview
bunx vercel deploy --prod   # production
```

Or install the CLI globally:

```bash
bun i -g vercel
vercel login
vercel deploy
```

### From Git

Connect the repository in the Vercel dashboard. Vercel runs `bun run build` and deploys automatically on push.

## Verify runtime

Add temporarily to any API handler:

```ts
console.log("runtime", process.versions.bun);
```

Check function logs in the Vercel dashboard. You should see a Bun version (e.g. `1.3.x`).

## URLs after deploy

| Path | Description |
|------|-------------|
| `/` | Redirects to `/swagger` |
| `/swagger` | Swagger UI |
| `/api/openapi.json` | OpenAPI spec |
| `/api/login` | SIWE login |
| Other paths | React SPA (`dist/index.html`) |

## References

- [Bun on Vercel](https://bun.com/docs/guides/deployment/vercel)
- [Vercel Bun runtime feature support](https://vercel.com/docs/functions/runtimes/bun#feature-support)
- [Hono Vercel adapter](https://hono.dev/docs/getting-started/vercel)
