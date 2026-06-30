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

## Production

```bash
bun run build
bun run start
```

Deploy to [Render](https://render.com/) using the included `render.yaml`, or any host that runs Bun with `bun run start`.

## Developer docs

See the [develop/](./develop/) directory.

| Doc | Description |
|-----|-------------|
| [develop/add-api.md](./develop/add-api.md) | How to add a new API endpoint |
