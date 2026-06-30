# How to add an API endpoint

This project uses **Hono + @hono/zod-openapi**: route definition, validation, handler, and OpenAPI docs live together.

## Two steps

### 1. Add a route module under `src/server/routes/`

Define the Zod schema, `createRoute`, and handler in one file:

```ts
import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";

const LoginBodySchema = z
  .object({
    username: z.string().openapi({ example: "alice" }),
    password: z.string().openapi({ example: "secret" }),
  })
  .openapi("LoginBody");

const loginRoute = createRoute({
  method: "post",
  path: "/api/user/login",
  tags: ["Users"],
  summary: "User login",
  request: {
    body: {
      content: {
        "application/json": {
          schema: LoginBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Success",
      content: {
        "application/json": {
          schema: z.object({
            code: z.number().openapi({ example: 200 }),
            data: z.object({
              userToken: z.string(),
            }),
          }),
        },
      },
    },
  },
});

export function registerUserRoutes(app: OpenAPIHono) {
  app.openapi(loginRoute, async (c) => {
    const body = c.req.valid("json"); // validated + typed
    // business logic...
    return c.json({ code: 200, data: { userToken: "..." } });
  });
}
```

### 2. Register the route module in `src/server/routes/index.ts`

```ts
import { registerUserRoutes } from "./user";

export function registerAllRoutes(app: OpenAPIHono<AppEnv>): void {
  // ...
  registerUserRoutes(app);
}
```

Refresh `/swagger` to see the new endpoint. No need to hand-write `openapi.json` or change `src/server/server.ts` / `src/server/index.ts`.

## Protected routes (JWT)

1. Register Bearer scheme once — already done in `registerOpenApiSecurity()` via `src/server/routes/index.ts`.
2. Add middleware on the path:

```ts
import { requireAuth } from "../lib/auth-middleware";
import { BEARER_SECURITY_SCHEME } from "../lib/openapi-security";

const meRoute = createRoute({
  method: "get",
  path: "/api/me",
  security: [{ [BEARER_SECURITY_SCHEME]: [] }],
  // ...
});

export function registerMeRoutes(app: OpenAPIHono<AppEnv>) {
  app.use("/api/me", requireAuth);
  app.openapi(meRoute, (c) =>
    c.json({ code: 200, data: { address: c.get("userAddress") } }, 200),
  );
}
```

Call protected endpoints with the `userToken` from `POST /api/login`:

```bash
curl http://localhost:3000/api/me \
  -H "Authorization: Bearer <userToken>"
```

The server accepts the token with or without a `Bearer ` prefix. Paste the token only when using clients that add `Bearer` automatically.

See [src/server/routes/me.ts](../src/server/routes/me.ts) for a full example.

## Swagger Try it out examples

If an endpoint needs a dynamic default body in Swagger, export a patch from the route module and register it in `src/server/lib/openapi-patches.ts`:

```ts
const patches: OpenApiPatch[] = [patchLoginOpenApiExample, patchYourOpenApiExample];
```

## File responsibilities

| File | Role |
|------|------|
| `src/server/routes/*.ts` | Schema + `createRoute` + handler (`app.openapi`) |
| `src/server/routes/index.ts` | Register all routes + OpenAPI security schemes |
| `src/server/lib/openapi-patches.ts` | Central Swagger spec patches |
| `src/server/lib/auth-middleware.ts` | `requireAuth` JWT middleware |
| `src/server/server.ts` | Hono app shell, OpenAPI JSON, static files |
| `src/server/index.ts` | Bun entry — `Bun.serve({ port, fetch: app.fetch })` |
| `src/client/` | React SPA + `swagger.html` |

## Conventions

- Path params: use OpenAPI style `/api/foo/{id}` in `createRoute` (Hono converts internally)
- `tags` group endpoints in Swagger (e.g. `"Users"`, `"Auth"`)
- `c.req.valid("json" | "param" | "query")` returns validated, typed input — define the handler inline in `app.openapi(route, async (c) => { ... })` so types infer correctly
- For auth, add `security: [{ [BEARER_SECURITY_SCHEME]: [] }]` on `createRoute`, use `app.use(path, requireAuth)`, and read `c.get("userAddress")` in the handler
- See `src/server/routes/login.ts` for SIWE login with multiple response schemas (200 / 401 / 500)
- See `src/server/routes/me.ts` for JWT-protected route
