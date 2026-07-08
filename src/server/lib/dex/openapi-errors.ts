import { z } from "@hono/zod-openapi";

export function createDexServerErrorResponses(provider: string) {
  const id = provider.replace(/\s+/g, "");

  const serviceUnavailableSchema = z
    .object({
      code: z.literal(-503).openapi({ example: -503 }),
      message: z.string().openapi({
        example: `${provider} API credentials are not configured`,
      }),
    })
    .openapi(`${id}DexServiceUnavailable`);

  const badGatewaySchema = z
    .object({
      code: z.literal(502).openapi({ example: 502 }),
      message: z.string().openapi({
        example: `Failed to reach ${provider} API`,
      }),
    })
    .openapi(`${id}DexBadGateway`);

  return {
    502: {
      description: `This server failed to reach ${provider}`,
      content: {
        "application/json": {
          schema: badGatewaySchema,
        },
      },
    },
    503: {
      description: `${provider} credentials not configured on this server`,
      content: {
        "application/json": {
          schema: serviceUnavailableSchema,
        },
      },
    },
  } as const;
}
