import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";
import type { AppEnv } from "../lib/app-env";
import { requireAuth } from "../lib/auth-middleware";
import { BEARER_SECURITY_SCHEME } from "../lib/openapi-security";

const MeResponseSchema = z
  .object({
    code: z.literal(200).openapi({ example: 200 }),
    data: z.object({
      address: z
        .string()
        .openapi({ example: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0" }),
    }),
  })
  .openapi("MeResponse");

const MeUnauthorizedSchema = z
  .object({
    code: z.literal(-401).openapi({ example: -401 }),
    message: z.string().openapi({ example: "Invalid token" }),
  })
  .openapi("MeUnauthorized");

const meRoute = createRoute({
  method: "get",
  path: "/api/me",
  tags: ["Auth"],
  summary: "Current session",
  description:
    "Returns the wallet address from a valid JWT.\n\n**Swagger:** Click **Authorize** (top right) → paste `userToken` from POST /api/login → **Authorize**. Paste the token only; do not type `Bearer `. If you paste `Bearer <token>` by mistake, the server still accepts it.",
  security: [{ [BEARER_SECURITY_SCHEME]: [] }],
  responses: {
    200: {
      description: "Authenticated",
      content: {
        "application/json": {
          schema: MeResponseSchema,
        },
      },
    },
    401: {
      description: "Missing or invalid token",
      content: {
        "application/json": {
          schema: MeUnauthorizedSchema,
        },
      },
    },
  },
});

export function registerMeRoutes(app: OpenAPIHono<AppEnv>) {
  app.use("/api/me", requireAuth);
  app.openapi(meRoute, (c) =>
    c.json({ code: 200, data: { address: c.get("userAddress") } }, 200),
  );
}
