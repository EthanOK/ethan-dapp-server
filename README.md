# Ethan DApp Client

Bun full-stack app: React frontend + Hono API, with OpenAPI docs generated via `@hono/zod-openapi`.

## Development

```bash
bun install
bun dev
```

| URL | Description |
|-----|-------------|
| http://localhost:3000/swagger | Swagger UI (default entry) |
| http://localhost:3000/api/openapi.json | OpenAPI spec |

## Developer docs

See the [develop/](./develop/) directory.

| Doc | Description |
|-----|-------------|
| [develop/add-api.md](./develop/add-api.md) | How to add a new API endpoint |
| [develop/deploy-vercel.md](./develop/deploy-vercel.md) | Deploy to Vercel |
