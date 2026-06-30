# How to add an API endpoint

This project uses **Hono + @hono/zod-openapi**: route definition, validation, handler, and OpenAPI docs live together.

## Two steps

### 1. Add a route module under `src/routes/`

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

### 2. Register the route module in `src/server.ts`

```ts
import { registerUserRoutes } from "./routes/user";

registerUserRoutes(app);
```

Refresh `/swagger` to see the new endpoint. No need to hand-write `openapi.json` or change `src/index.ts`.

## File responsibilities

| File | Role |
|------|------|
| `src/routes/*.ts` | Schema + `createRoute` + handler (`app.openapi`) |
| `src/server.ts` | Hono app: routes, OpenAPI, static files |
| `src/index.ts` | Bun entry — `Bun.serve({ port, fetch: app.fetch })` |

## Conventions

- Path params: use OpenAPI style `/api/foo/{id}` in `createRoute` (Hono converts internally)
- `tags` group endpoints in Swagger (e.g. `"Users"`, `"Auth"`)
- `c.req.valid("json" | "param" | "query")` returns validated, typed input — define the handler inline in `app.openapi(route, async (c) => { ... })` so types infer correctly
- For auth, add `security` on `createRoute` and register `securitySchemes` via `app.openAPIRegistry`
- See `src/routes/login.ts` for SIWE login with multiple response schemas (200 / 401 / 500)
