import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";
import type { AppEnv } from "../lib/app-env";
import { requireAuth } from "../lib/auth-middleware";
import { BEARER_SECURITY_SCHEME } from "../lib/openapi-security";
import { WEBHOOK_FORWARD_TIMEOUT_MS, webhookTargetFor } from "../config";

// Headers that must not be relayed: hop-by-hop headers, content-length
// (recomputed by fetch), and our own JWT Authorization (not meant for the target).
const STRIPPED_FORWARD_HEADERS = new Set([
  "host",
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "te",
  "trailer",
  "proxy-authorization",
  "proxy-authenticate",
  "content-length",
  "authorization",
]);

function buildForwardHeaders(src: Headers): Headers {
  const out = new Headers();
  src.forEach((value, key) => {
    if (!STRIPPED_FORWARD_HEADERS.has(key.toLowerCase())) {
      out.set(key, value);
    }
  });
  out.set("content-type", "application/json");
  return out;
}

const WebhookBodySchema = z
  .object({
    destination: z
      .string()
      .regex(/^[a-z0-9_]+$/)
      .openapi({
        example: "discord",
        description:
          "Routing key. Resolves to the WEBHOOK_<DESTINATION>_URL env var (e.g. discord -> WEBHOOK_DISCORD_URL). Lowercase letters, digits, and underscores only.",
      }),
  })
  .catchall(z.unknown())
  .openapi("WebhookPayload", {
    description:
      "Routing key plus arbitrary payload. All fields except `destination` are forwarded to the resolved target.",
    example: { destination: "discord", content: "Hello from webhook" },
  });

const WebhookSuccessSchema = z
  .object({
    code: z.literal(200).openapi({ example: 200 }),
    data: z.object({
      forwarded: z.literal(true).openapi({ example: true }),
      destination: z.string().openapi({ example: "discord" }),
      targetStatus: z.number().openapi({ example: 200 }),
    }),
  })
  .openapi("WebhookForwardSuccess");

const WebhookBadRequestSchema = z
  .object({
    code: z.literal(-400).openapi({ example: -400 }),
    message: z
      .string()
      .openapi({ example: "Unknown or unconfigured destination: discord" }),
  })
  .openapi("WebhookBadRequest");

const WebhookUnauthorizedSchema = z
  .object({
    code: z.literal(-401).openapi({ example: -401 }),
    message: z.string().openapi({ example: "Invalid token" }),
  })
  .openapi("WebhookUnauthorized");

const WebhookBadGatewaySchema = z
  .object({
    code: z.literal(502).openapi({ example: 502 }),
    message: z.string().openapi({ example: "Failed to reach forward target" }),
    targetStatus: z
      .number()
      .optional()
      .openapi({
        example: 404,
        description: "Target HTTP status when the target responded non-2xx",
      }),
  })
  .openapi("WebhookBadGateway");

const webhookRoute = createRoute({
  method: "post",
  path: "/api/webhooks",
  tags: ["Webhooks"],
  summary: "Relay webhook",
  description:
    "Receive an inbound webhook and route it by `destination` to the matching WEBHOOK_<DESTINATION>_URL. All fields except `destination` are forwarded; upstream headers are relayed (except hop-by-hop headers and the JWT Authorization header). Requires a valid JWT.",
  security: [{ [BEARER_SECURITY_SCHEME]: [] }],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: WebhookBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Forwarded to target",
      content: {
        "application/json": {
          schema: WebhookSuccessSchema,
        },
      },
    },
    400: {
      description: "Unknown or unconfigured destination",
      content: {
        "application/json": {
          schema: WebhookBadRequestSchema,
        },
      },
    },
    401: {
      description: "Missing or invalid token",
      content: {
        "application/json": {
          schema: WebhookUnauthorizedSchema,
        },
      },
    },
    502: {
      description: "Forward target unreachable",
      content: {
        "application/json": {
          schema: WebhookBadGatewaySchema,
        },
      },
    },
  },
});

export function registerWebhookRoutes(app: OpenAPIHono<AppEnv>) {
  app.use("/api/webhooks", requireAuth);
  app.openapi(webhookRoute, async (c) => {
    const { destination, ...payload } = c.req.valid("json");

    const target = webhookTargetFor(destination);
    if (!target) {
      return c.json(
        {
          code: -400,
          message: `Unknown or unconfigured destination: ${destination}`,
        },
        400,
      );
    }

    try {
      const res = await fetch(target, {
        method: "POST",
        headers: buildForwardHeaders(c.req.raw.headers),
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(WEBHOOK_FORWARD_TIMEOUT_MS),
      });

      if (!res.ok) {
        return c.json(
          {
            code: 502 as const,
            message: `Forward target responded with ${res.status}`,
            targetStatus: res.status,
          },
          502,
        );
      }

      return c.json(
        {
          code: 200 as const,
          data: {
            forwarded: true as const,
            destination,
            targetStatus: res.status,
          },
        },
        200,
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to reach forward target";
      return c.json({ code: 502 as const, message }, 502);
    }
  });
}
