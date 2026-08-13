import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";
import type { AppEnv } from "../lib/app-env";
import { requireAuth } from "../lib/auth-middleware";
import { BEARER_SECURITY_SCHEME } from "../lib/openapi-security";
import { relayEIP7702 } from "../lib/relay-7702";

const AuthorizationEntrySchema = z.object({
  chainId: z.number().int().nonnegative(),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  nonce: z.number().int().nonnegative(),
  yParity: z.union([z.number(), z.string()]),
  r: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  s: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
});

const RelayBodySchema = z
  .object({
    chainId: z.number().int().nonnegative(),
    to: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    authorizationList: z.array(AuthorizationEntrySchema).min(1),
  })
  .openapi("Relay7702Body");

const RelaySuccessSchema = z
  .object({
    code: z.literal(200).openapi({ example: 200 }),
    data: z.object({
      txHash: z.string().openapi({
        example: "0x578df99750d988ea3af1c4c871c5ba624700d538725dac6570c916ed3236f68c",
      }),
      from: z.string().openapi({
        example: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
      }),
    }),
  })
  .openapi("Relay7702Success");

const RelayErrorSchema = z
  .object({
    code: z.literal(500).openapi({ example: 500 }),
    message: z.string().openapi({ example: "RELAYER_PRIVATE_KEY is not configured" }),
  })
  .openapi("Relay7702Error");

const relayRoute = createRoute({
  method: "post",
  path: "/api/relay7702",
  tags: ["EIP-7702"],
  summary: "Broadcast an EIP-7702 type-4 transaction (gas sponsored by the relayer)",
  description:
    "Accepts a signed EIP-7702 authorization list and broadcasts a type-4 transaction whose sender is the server's relayer account (it pays the gas). The authorization must be signed by the EOA being delegated. Requires a valid login token.",
  security: [{ [BEARER_SECURITY_SCHEME]: [] }],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: RelayBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Transaction broadcast",
      content: {
        "application/json": {
          schema: RelaySuccessSchema,
        },
      },
    },
    401: {
      description: "Missing or invalid token",
      content: {
        "application/json": {
          schema: z
            .object({
              code: z.literal(-401),
              message: z.string(),
            })
            .openapi("Relay7702Unauthorized"),
        },
      },
    },
    500: {
      description: "Relay failed (relayer key missing, RPC missing, or broadcast error)",
      content: {
        "application/json": {
          schema: RelayErrorSchema,
        },
      },
    },
  },
});

export function registerRelay7702Routes(app: OpenAPIHono<AppEnv>) {
  app.use("/api/relay7702", requireAuth);
  app.openapi(relayRoute, async (c) => {
    const body = c.req.valid("json");
    try {
      const result = await relayEIP7702(body);
      return c.json({ code: 200, data: result }, 200);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Relay failed";
      return c.json({ code: 500, message }, 500);
    }
  });
}
